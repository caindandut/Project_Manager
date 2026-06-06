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

export const requireCommentRole = (requiredRole: ProjectRole) => {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const commentId = parseInt(req.params.commentId || req.params.id || '0', 10);
      if (!commentId || Number.isNaN(commentId)) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid comment ID');
      }

      const comment = await prisma.comment.findFirst({
        where: { id: commentId, deletedAt: null },
        select: {
          task: {
            select: {
              project: {
                select: {
                  id: true,
                  ownerId: true,
                  workspaceId: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      });

      if (!comment || comment.task.project.deletedAt) {
        throw ApiError.notFound(ErrorCode.COMMENT_NOT_FOUND, 'Comment not found');
      }

      const workspaceMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: comment.task.project.workspaceId,
          userId: req.user.id,
          deletedAt: null,
        },
      });

      if (!workspaceMember) {
        throw ApiError.forbidden(
          ErrorCode.FORBIDDEN_ACCESS,
          'You are not a member of this workspace',
        );
      }

      const projectRole = await getProjectRole(
        comment.task.project.id,
        comment.task.project.ownerId,
        req.user.id,
      );

      if (projectRoleHierarchy[projectRole] < projectRoleHierarchy[requiredRole]) {
        throw ApiError.forbidden(
          ErrorCode.FORBIDDEN_ACCESS,
          `This action requires ${requiredRole} project role`,
        );
      }

      req.workspaceId = comment.task.project.workspaceId;
      req.workspaceRole = workspaceMember.role as WorkspaceRole;
      next();
    } catch (error) {
      next(error);
    }
  };
};

async function getProjectRole(
  projectId: number,
  ownerId: number,
  userId: number,
): Promise<ProjectRole> {
  if (ownerId === userId) return 'ADMIN';

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
}
