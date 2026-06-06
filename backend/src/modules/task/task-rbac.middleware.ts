import { NextFunction, Response } from 'express';
import { ProjectRole } from '@prisma/client';
import { prisma } from '../../config';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { AuthenticatedRequest, WorkspaceRole } from '../../types/interfaces';

const projectRoleHierarchy: Record<ProjectRole, number> = {
  ADMIN: 3,
  MEMBER: 2,
  GUEST: 1,
};

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
 * Checks if the user owns the project or is an accepted project member.
 * Returns true if the user has access to the project.
 */
const assertProjectAccess = async (
  userId: number,
  projectId: number,
): Promise<ProjectRole> => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { ownerId: true },
  });

  if (!project) {
    throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
  }

  if (project.ownerId === userId) return 'ADMIN';

  const projectMember = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
      status: 'ACCEPTED',
      deletedAt: null,
    },
  });

  if (!projectMember) {
    throw ApiError.forbidden(
      ErrorCode.FORBIDDEN_ACCESS,
      'You are not a member of this project',
    );
  }

  return projectMember.role as ProjectRole;
};

/**
 * Middleware for routes with :projectId param (e.g. /projects/:projectId/tasks).
 * Checks workspace membership and project role.
 */
export const requireProjectTaskRole = (requiredRole: ProjectRole) => {
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

      const { role: workspaceRole } = await getWorkspaceMembership(req.user.id, project.workspaceId);
      const projectRole = await assertProjectAccess(req.user.id, projectId);

      if (projectRoleHierarchy[projectRole] < projectRoleHierarchy[requiredRole]) {
        throw ApiError.forbidden(
          ErrorCode.FORBIDDEN_ACCESS,
          `This action requires ${requiredRole} project role`,
        );
      }

      req.workspaceId = project.workspaceId;
      req.workspaceRole = workspaceRole;
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
export const requireTaskRole = (requiredRole: ProjectRole) => {
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

      const { role: workspaceRole } = await getWorkspaceMembership(req.user.id, task.project.workspaceId);
      const projectRole = await assertProjectAccess(req.user.id, task.projectId);

      if (projectRoleHierarchy[projectRole] < projectRoleHierarchy[requiredRole]) {
        throw ApiError.forbidden(
          ErrorCode.FORBIDDEN_ACCESS,
          `This action requires ${requiredRole} project role`,
        );
      }

      req.workspaceId = task.project.workspaceId;
      req.workspaceRole = workspaceRole;
      next();
    } catch (error) {
      next(error);
    }
  };
};
