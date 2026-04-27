import { Response, NextFunction } from 'express';
import { prisma } from '../../config';
import { AuthenticatedRequest, WorkspaceRole } from '../../types/interfaces';
import { ApiError } from '../utils/apiError';
import { ErrorCode } from '../../types/enums';
import { WORKSPACE_ROLES_HIERARCHY } from '../../config/constants';

export interface RbacOptions {
  requiredRoles?: WorkspaceRole[];
  allowOwner?: boolean;
  allowMember?: boolean;
  allowGuest?: boolean;
}

const roleHierarchy: Record<WorkspaceRole, number> = WORKSPACE_ROLES_HIERARCHY;

export const requireWorkspaceRole = (options: RbacOptions) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized(
          ErrorCode.AUTH_TOKEN_INVALID,
          'Authentication required'
        );
      }

      const workspaceIdParam = req.params.workspaceId || req.body.workspaceId || '';
      const isNumeric = /^\d+$/.test(workspaceIdParam);

      let resolvedWorkspaceId: number;

      if (isNumeric) {
        resolvedWorkspaceId = Number(workspaceIdParam);
      } else {
        const workspace = await prisma.workspace.findUnique({
          where: { slug: workspaceIdParam, deletedAt: null },
          select: { id: true },
        });
        if (!workspace) {
          throw ApiError.notFound(ErrorCode.WORKSPACE_NOT_FOUND, 'Workspace not found');
        }
        resolvedWorkspaceId = workspace.id;
      }

      const membership = await prisma.workspaceMember.findFirst({
        where: {
          userId: req.user.id,
          workspaceId: resolvedWorkspaceId,
          deletedAt: null,
        },
      });

      if (!membership) {
        throw ApiError.forbidden(
          ErrorCode.FORBIDDEN_ACCESS,
          'You are not a member of this workspace'
        );
      }

      const userRole = membership.role as WorkspaceRole;
      req.workspaceRole = userRole;
      req.workspaceId = resolvedWorkspaceId;
      req.params.workspaceId = String(resolvedWorkspaceId);

      if (options.requiredRoles && options.requiredRoles.length > 0) {
        const hasRequiredRole = options.requiredRoles.some(
          (role) => roleHierarchy[userRole] >= roleHierarchy[role]
        );

        if (!hasRequiredRole) {
          throw ApiError.forbidden(
            ErrorCode.FORBIDDEN_ACCESS,
            `This action requires one of these roles: ${options.requiredRoles.join(', ')}`
          );
        }
      }

      if (options.allowOwner === false && userRole === 'OWNER') {
        throw ApiError.forbidden(
          ErrorCode.FORBIDDEN_ACCESS,
          'Owners are not allowed to perform this action'
        );
      }

      if (options.allowMember === false && userRole === 'MEMBER') {
        throw ApiError.forbidden(
          ErrorCode.FORBIDDEN_ACCESS,
          'Members are not allowed to perform this action'
        );
      }

      if (options.allowGuest === false && userRole === 'GUEST') {
        throw ApiError.forbidden(
          ErrorCode.FORBIDDEN_ACCESS,
          'Guests are not allowed to perform this action'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireOwner = requireWorkspaceRole({
  requiredRoles: ['OWNER', 'ADMIN'],
});

export const requireMember = requireWorkspaceRole({
  requiredRoles: ['MEMBER'],
});

export const requireGuest = requireWorkspaceRole({
  requiredRoles: ['GUEST'],
});

export const requireOwnerOrMember = requireWorkspaceRole({
  requiredRoles: ['MEMBER'],
});

export const allowAllRoles = requireWorkspaceRole({});

// Convenience factory — accepts an array of allowed roles directly
export const requireRoles = (allowedRoles: WorkspaceRole[]) =>
  requireWorkspaceRole({ requiredRoles: allowedRoles });
