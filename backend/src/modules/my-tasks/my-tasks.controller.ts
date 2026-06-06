import { Request, Response } from 'express';
import { BaseController } from '../../common/base/BaseController';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { AuthenticatedRequest } from '../../types/interfaces';
import { myTasksService } from './my-tasks.service';

export class MyTasksController extends BaseController {
  constructor() {
    super('MyTasksController');
  }

  getWorkspaceMyTasks = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = this.requireAuth(req);
      const workspaceId = this.getWorkspaceId(req);
      const query = myTasksService.buildQuery(req.query as Record<string, unknown>);
      const result = await myTasksService.getWorkspaceMyTasks(workspaceId, authReq.user.id, query);

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
    const workspaceId = parseInt(req.params.workspaceId || '0', 10);
    if (!workspaceId || isNaN(workspaceId)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid workspace ID');
    }

    return workspaceId;
  }
}

export const myTasksController = new MyTasksController();
