import { Request, Response } from 'express';
import { commentService } from './comment.service';
import { BaseController } from '../../common/base/BaseController';
import { AuthenticatedRequest } from '../../types/interfaces';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';

export class CommentController extends BaseController {
  constructor() {
    super('CommentController');
  }

  create = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const taskId = parseInt(req.params.taskId, 10);
      const result = await commentService.create({
        ...req.body,
        taskId,
        userId: authReq.user.id,
      });
      res.status(201).json(success(result));
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const commentId = parseInt(req.params.commentId || req.params.id, 10);
      const result = await commentService.getById(commentId);
      res.json(success(result));
    });
  };

  getAllByTask = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const taskId = parseInt(req.params.taskId, 10);
      const page = parseInt(req.query.page as string, 10) || undefined;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const cursor = req.query.cursor as string;

      const result = await commentService.getAllByTask(taskId, { page, limit, cursor });
      res.json(success(result.data, result.meta));
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const commentId = parseInt(req.params.commentId || req.params.id, 10);
      const result = await commentService.update(commentId, req.body, authReq.user.id);
      res.json(success(result));
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const commentId = parseInt(req.params.commentId || req.params.id, 10);
      const result = await commentService.delete(commentId, authReq.user.id);
      res.json(success(result));
    });
  };
}

export const commentController = new CommentController();
