import { Request, Response } from 'express';
import { notificationService } from './notification.service';
import { BaseController } from '../../common/base/BaseController';
import { AuthenticatedRequest } from '../../types/interfaces';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';

export class NotificationController extends BaseController {
  constructor() {
    super('NotificationController');
  }

  getAll = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const limit = parseInt(req.query.limit as string, 10) || 20;
      const cursor = req.query.cursor as string;
      const isRead =
        typeof req.query.isRead === 'string'
          ? String(req.query.isRead).toLowerCase() === 'true'
          : undefined;
      const type = typeof req.query.type === 'string' ? req.query.type : undefined;

      const result = await notificationService.getAllForUser(authReq.user.id, {
        limit,
        cursor,
        isRead,
        type,
      });
      res.json(success(result.data, result.meta));
    });
  };

  markAsRead = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const notificationId = parseInt(req.params.id, 10);
      const result = await notificationService.markAsRead(notificationId, authReq.user.id);
      res.json(success(result));
    });
  };

  markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const type = typeof req.query.type === 'string' ? req.query.type : undefined;
      const result = await notificationService.markAllAsRead(authReq.user.id, type);
      res.json(success(result));
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const notificationId = parseInt(req.params.id, 10);
      const result = await notificationService.delete(notificationId, authReq.user.id);
      res.json(success(result));
    });
  };

  clearAll = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const type = typeof req.query.type === 'string' ? req.query.type : undefined;
      const result = await notificationService.clearAll(authReq.user.id, type);
      res.json(success(result));
    });
  };
}

export const notificationController = new NotificationController();
