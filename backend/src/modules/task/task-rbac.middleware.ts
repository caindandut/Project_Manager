import { NextFunction, Response } from 'express';
import { prisma } from '../../config';
import { WORKSPACE_ROLES_HIERARCHY } from '../../config/constants';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { AuthenticatedRequest, WorkspaceRole } from '../../types/interfaces';

const roleHierarchy: Record<WorkspaceRole, number> = WORKSPACE_ROLES_HIERARCHY;

const requireWorkspaceMembership = async (
  req: AuthenticatedRequest,
  workspaceId: number,
  requiredRole: WorkspaceRole,
): Promise<void> => {
  if (!req.user) {
    throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: req.user.id,
      deletedAt: null,
    },
  });

  if (!membership) {
    throw ApiError.forbidden(
      ErrorCode.FORBIDDEN_ACCESS,
      'You are not a member of this workspace',
    );
  }

  const userRole = membership.role as WorkspaceRole;
  if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
    throw ApiError.forbidden(
      ErrorCode.FORBIDDEN_ACCESS,
      `This action requires ${requiredRole} role`,
    );
  }

  req.workspaceId = workspaceId;
  req.workspaceRole = userRole;
};

export const requireProjectTaskRole = (requiredRole: WorkspaceRole) => {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
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

      await requireWorkspaceMembership(req, project.workspaceId, requiredRole);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireTaskRole = (requiredRole: WorkspaceRole) => {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const taskId = parseInt(req.params.taskId || '0', 10);
      if (!taskId || isNaN(taskId)) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid task ID');
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: {
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

      await requireWorkspaceMembership(req, task.project.workspaceId, requiredRole);
      next();
    } catch (error) {
      next(error);
    }
  };
};
