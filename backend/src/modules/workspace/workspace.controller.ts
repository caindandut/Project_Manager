import { Request, Response } from 'express';
import { workspaceService } from './workspace.service';
import { BaseController } from '../../common/base/BaseController';
import { AuthenticatedRequest } from '../../types/interfaces';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode, WorkspaceRole } from '../../types/enums';

export class WorkspaceController extends BaseController {
  constructor() {
    super('WorkspaceController');
  }

  create = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = this.requireAuth(req);
      const result = await workspaceService.createForUser(req.body, authReq.user.id);
      res.status(201).json(success(result));
    });
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = this.requireAuth(req);
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await workspaceService.getAllForUser(authReq.user.id, { page, limit });
      res.json(success(result.data, result.meta));
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = this.requireAuth(req);
      const workspaceId = this.getWorkspaceId(req);
      const result = await workspaceService.getWorkspaceDetail(workspaceId, authReq.user.id);
      res.json(success(result));
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const workspaceId = this.getWorkspaceId(req);
      const result = await workspaceService.update(workspaceId, req.body);
      res.json(success(result));
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const workspaceId = this.getWorkspaceId(req);
      const result = await workspaceService.delete(workspaceId);
      res.json(success(result));
    });
  };

  getMembers = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const workspaceId = this.getWorkspaceId(req);
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const role = this.getRoleFilter(req);

      const result = await workspaceService.getMembers(workspaceId, { page, limit, role });
      res.json(success(result.data, result.meta));
    });
  };

  inviteMember = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const workspaceId = this.getWorkspaceId(req);
      const result = await workspaceService.inviteMember(workspaceId, req.body);
      res.status(201).json(success(result));
    });
  };

  updateMemberRole = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = this.requireAuth(req);
      const workspaceId = this.getWorkspaceId(req);
      const memberId = this.getMemberId(req);
      const result = await workspaceService.updateMemberRole(
        workspaceId,
        memberId,
        req.body,
        authReq.user.id,
      );
      res.json(success(result));
    });
  };

  leave = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = this.requireAuth(req);
      const workspaceId = this.getWorkspaceId(req);
      const result = await workspaceService.leave(workspaceId, authReq.user.id);
      res.json(success(result));
    });
  };

  removeMember = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = this.requireAuth(req);
      const workspaceId = this.getWorkspaceId(req);
      const memberId = this.getMemberId(req);
      const result = await workspaceService.removeMember(
        workspaceId,
        memberId,
        authReq.user.id,
      );
      res.json(success(result));
    });
  };

  getPendingInvitations = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const workspaceId = this.getWorkspaceId(req);
      const result = await workspaceService.getPendingInvitations(workspaceId);
      res.json(success(result.data));
    });
  };

  cancelInvitation = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = this.requireAuth(req);
      const workspaceId = this.getWorkspaceId(req);
      const invitationId = parseInt(req.params.invitationId as string, 10);
      if (!invitationId || isNaN(invitationId)) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid invitation ID');
      }
      const result = await workspaceService.cancelInvitation(
        workspaceId,
        invitationId,
        authReq.user.id,
      );
      res.json(success(result));
    });
  };

  private requireAuth(req: Request): AuthenticatedRequest & { user: NonNullable<AuthenticatedRequest['user']> } {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
    }

    return authReq as AuthenticatedRequest & { user: NonNullable<AuthenticatedRequest['user']> };
  }

  private getWorkspaceId(req: Request): number {
    const workspaceId = parseInt(req.params.workspaceId || req.params.id || '0', 10);
    if (!workspaceId || isNaN(workspaceId)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid workspace ID');
    }

    return workspaceId;
  }

  private getMemberId(req: Request): number {
    const memberId = parseInt(req.params.memberId || '0', 10);
    if (!memberId || isNaN(memberId)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid member ID');
    }

    return memberId;
  }

  private getRoleFilter(req: Request): WorkspaceRole | undefined {
    const role = req.query.role;
    if (role === undefined) return undefined;
    if (role === WorkspaceRole.OWNER || role === WorkspaceRole.MEMBER || role === WorkspaceRole.GUEST) {
      return role;
    }

    throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid role filter');
  }
}

export const workspaceController = new WorkspaceController();
