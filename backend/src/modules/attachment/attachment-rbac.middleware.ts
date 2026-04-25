import { NextFunction, Response } from 'express';
import { prisma } from '../../config';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { AuthenticatedRequest, WorkspaceRole } from '../../types/interfaces';
import { WORKSPACE_ROLES_HIERARCHY } from '../../config/constants';

const roleHierarchy: Record<WorkspaceRole, number> = WORKSPACE_ROLES_HIERARCHY;

export const requireAttachmentRole = (requiredRole: WorkspaceRole) => {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const attachmentId = parseInt(req.params.attachmentId || '0', 10);
      if (!attachmentId || Number.isNaN(attachmentId)) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid attachment ID');
      }

      const attachment = await prisma.attachment.findFirst({
        where: { id: attachmentId, deletedAt: null },
        select: {
          task: {
            select: {
              project: {
                select: {
                  workspaceId: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      });

      if (!attachment || attachment.task.project.deletedAt) {
        throw ApiError.notFound(ErrorCode.ATTACHMENT_NOT_FOUND, 'Attachment not found');
      }

      const membership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: attachment.task.project.workspaceId,
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

      req.workspaceId = attachment.task.project.workspaceId;
      req.workspaceRole = userRole;

      next();
    } catch (error) {
      next(error);
    }
  };
};
