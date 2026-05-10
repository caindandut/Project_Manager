import { Request, Response } from 'express';
import { projectMemberService } from './project-member.service';
import { BaseController } from '../../common/base/BaseController';
import { AuthenticatedRequest } from '../../types/interfaces';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';

export class ProjectMemberController extends BaseController {
  constructor() {
    super('ProjectMemberController');
  }

  /**
   * GET /api/v1/projects/:projectId/members
   */
  getMembers = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = this.requireAuth(req);
      const projectId = this.getProjectId(req);
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await projectMemberService.getMembers(
        projectId,
        authReq.user.id,
        { page, limit },
      );

      res.json(success(result.data, result.meta));
    });
  };

  /**
   * POST /api/v1/projects/:projectId/members
   */
  addMember = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = this.requireAuth(req);
      const projectId = this.getProjectId(req);

      const result = await projectMemberService.addMember(
        projectId,
        req.body,
        authReq.user.id,
      );

      res.status(201).json(success(result));
    });
  };

  /**
   * PATCH /api/v1/projects/:projectId/members/:memberId
   */
  updateRole = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = this.requireAuth(req);
      const projectId = this.getProjectId(req);
      const memberId = this.getMemberId(req);

      const result = await projectMemberService.updateMemberRole(
        projectId,
        memberId,
        req.body,
        authReq.user.id,
      );

      res.json(success(result));
    });
  };

  /**
   * DELETE /api/v1/projects/:projectId/members/:memberId
   */
  removeMember = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = this.requireAuth(req);
      const projectId = this.getProjectId(req);
      const memberId = this.getMemberId(req);

      const result = await projectMemberService.removeMember(
        projectId,
        memberId,
        authReq.user.id,
      );

      res.json(success(result));
    });
  };

  // =================================================================
  // Private helpers
  // =================================================================

  private requireAuth(req: Request): AuthenticatedRequest & { user: NonNullable<AuthenticatedRequest['user']> } {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
    }
    return authReq as AuthenticatedRequest & { user: NonNullable<AuthenticatedRequest['user']> };
  }

  private getProjectId(req: Request): number {
    const projectId = parseInt(req.params.projectId || '0', 10);
    if (!projectId || isNaN(projectId)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid project ID');
    }
    return projectId;
  }

  private getMemberId(req: Request): number {
    const memberId = parseInt(req.params.memberId || '0', 10);
    if (!memberId || isNaN(memberId)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid member ID');
    }
    return memberId;
  }
}

export const projectMemberController = new ProjectMemberController();
