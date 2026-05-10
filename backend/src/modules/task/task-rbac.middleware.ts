import { NextFunction, Response } from 'express';
import { prisma } from '../../config';
import { WORKSPACE_ROLES_HIERARCHY } from '../../config/constants';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { AuthenticatedRequest, WorkspaceRole } from '../../types/interfaces';

const roleHierarchy: Record<WorkspaceRole, number> = WORKSPACE_ROLES_HIERARCHY;

/**
 * Checks workspace membership and returns the workspace role + workspaceId.
 */
const getWorkspaceMembership = async (
  userId: number,
  workspaceId: number,
): Promise<{ role: WorkspaceRole }> => {
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      deletedAt: null,
    },
  });

  if (!membership) {
    throw ApiError.forbidden(
      ErrorCode.FORBIDDEN_ACCESS,
      'You are not a member of this workspace',
    );
  }

  return { role: membership.role as WorkspaceRole };
};

/**
 * Checks if the user is a project member (or workspace OWNER/ADMIN).
 * Returns true if the user has access to the project.
 */
const assertProjectAccess = async (
  userId: number,
  projectId: number,
  workspaceId: number,
  workspaceRole: WorkspaceRole,
): Promise<void> => {
  // Workspace OWNER/ADMIN can access all projects
  if (workspaceRole === 'OWNER' || workspaceRole === 'ADMIN') {
    return;
  }

  // Check ProjectMember
  const projectMember = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
      deletedAt: null,
    },
  });

  if (!projectMember) {
    throw ApiError.forbidden(
      ErrorCode.FORBIDDEN_ACCESS,
      'You are not a member of this project',
    );
  }
};

/**
 * Middleware for routes with :projectId param (e.g. /projects/:projectId/tasks).
 * Checks workspace membership role AND project membership.
 */
export const requireProjectTaskRole = (requiredRole: WorkspaceRole) => {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const projectId = parseInt(req.params.projectId || '0', 10);
      if (!projectId || isNaN(projectId)) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid project ID');
      }

      const project = await prisma.project.findFirst({
        where: { id: projectId, deletedAt: null },
        select: { workspaceId: true },
      });

      if (!project) {
        throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
      }

      const { role: userRole } = await getWorkspaceMembership(req.user.id, project.workspaceId);

      if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
        throw ApiError.forbidden(
          ErrorCode.FORBIDDEN_ACCESS,
          `This action requires ${requiredRole} role`,
        );
      }

      // Check project membership (workspace OWNER/ADMIN bypass)
      await assertProjectAccess(req.user.id, projectId, project.workspaceId, userRole);

      req.workspaceId = project.workspaceId;
      req.workspaceRole = userRole;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware for routes with :taskId param (e.g. /tasks/:taskId).
 * Resolves the task → project → workspace chain, then checks both
 * workspace role and project membership.
 */
export const requireTaskRole = (requiredRole: WorkspaceRole) => {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const taskId = parseInt(req.params.taskId || '0', 10);
      if (!taskId || isNaN(taskId)) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid task ID');
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: {
          projectId: true,
          project: {
            select: {
              workspaceId: true,
              deletedAt: true,
            },
          },
        },
      });

      if (!task || task.project.deletedAt) {
        throw ApiError.notFound(ErrorCode.TASK_NOT_FOUND, 'Task not found');
      }

      const { role: userRole } = await getWorkspaceMembership(req.user.id, task.project.workspaceId);

      if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
        throw ApiError.forbidden(
          ErrorCode.FORBIDDEN_ACCESS,
          `This action requires ${requiredRole} role`,
        );
      }

      // Check project membership (workspace OWNER/ADMIN bypass)
      await assertProjectAccess(req.user.id, task.projectId, task.project.workspaceId, userRole);

      req.workspaceId = task.project.workspaceId;
      req.workspaceRole = userRole;
      next();
    } catch (error) {
      next(error);
    }
  };
};
