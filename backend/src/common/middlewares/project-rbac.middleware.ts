import { Response, NextFunction } from 'express';
import { prisma } from '../../config';
import { AuthenticatedRequest } from '../../types/interfaces';
import { ApiError } from '../utils/apiError';
import { ErrorCode } from '../../types/enums';
import { ProjectRole } from '@prisma/client';

const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  ADMIN: 3,
  MEMBER: 2,
  GUEST: 1,
};

export interface ProjectRbacOptions {
  requiredRoles?: ProjectRole[];
}

/**
 * Middleware that checks if the current user has a required role
 * in the project identified by `req.params.projectId`.
 *
 * It attaches `req.projectRole` and resolves `req.params.projectId`
 * to a numeric ID for downstream handlers.
 */
export const requireProjectRole = (options: ProjectRbacOptions) => {
  return async (
    req: AuthenticatedRequest & { projectRole?: ProjectRole },
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized(
          ErrorCode.AUTH_TOKEN_INVALID,
          'Authentication required',
        );
      }

      const projectIdParam = req.params.projectId || '';
      const projectId = parseInt(projectIdParam, 10);
      if (!projectId || isNaN(projectId)) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid project ID');
      }

      // Verify the project exists
      const project = await prisma.project.findFirst({
        where: { id: projectId, deletedAt: null },
        select: { id: true, ownerId: true },
      });
      if (!project) {
        throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
      }

      let userRole: ProjectRole;

      if (project.ownerId === req.user.id) {
        userRole = 'ADMIN';
      } else {
        // Check membership
        const membership = await prisma.projectMember.findFirst({
          where: {
            projectId,
            userId: req.user.id,
            status: 'ACCEPTED',
            deletedAt: null,
          },
        });

        if (!membership) {
          throw ApiError.forbidden(
            ErrorCode.FORBIDDEN_ACCESS,
            'You are not a member of this project',
          );
        }
        userRole = membership.role as ProjectRole;
      }

      (req as AuthenticatedRequest & { projectRole?: ProjectRole }).projectRole = userRole;

      if (options.requiredRoles && options.requiredRoles.length > 0) {
        const hasRequiredRole = options.requiredRoles.some(
          (role) => PROJECT_ROLE_HIERARCHY[userRole] >= PROJECT_ROLE_HIERARCHY[role],
        );

        if (!hasRequiredRole) {
          throw ApiError.forbidden(
            ErrorCode.FORBIDDEN_ACCESS,
            `This action requires one of these project roles: ${options.requiredRoles.join(', ')}`,
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/** Only project ADMIN (the creator) can perform this action */
export const requireProjectAdmin = requireProjectRole({
  requiredRoles: ['ADMIN'],
});

/** Any project member (ADMIN, MEMBER, GUEST) */
export const requireProjectMember = requireProjectRole({
  requiredRoles: ['GUEST'],
});
