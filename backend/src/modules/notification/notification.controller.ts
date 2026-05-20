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

  /**
   * GET /notifications
   * Query: category, limit, cursor, isRead, type, grouped
   */
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
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const grouped = req.query.grouped === 'true';

      if (grouped) {
        const result = await notificationService.getGroupedForUser(authReq.user.id, {
          limit,
          category,
          isRead,
        });
        res.json(success(result.data, result.meta));
      } else {
        const result = await notificationService.getAllForUser(authReq.user.id, {
          limit,
          cursor,
          isRead,
          type,
          category,
        });
        res.json(success(result.data, result.meta));
      }
    });
  };

  /**
   * GET /notifications/unread-count
   * Returns DIRECT unread count only (for badge).
   */
  getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const count = await notificationService.getUnreadDirectCount(authReq.user.id);
      res.json(success({ unreadCount: count }));
    });
  };

  /**
   * GET /notifications/groups/:groupKey
   * Returns all notifications within a group, ordered chronologically.
   */
  getGroupDetail = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const groupKey = req.params.groupKey;
      const result = await notificationService.getGroupDetail(authReq.user.id, groupKey);
      res.json(success(result));
    });
  };

  /**
   * PATCH /notifications/:id
   * Mark a single notification as read.
   */
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

  /**
   * PATCH /notifications
   * Mark all as read, optionally filtered by category.
   * Query: category
   */
  markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const result = await notificationService.markAllAsRead(authReq.user.id, category);
      res.json(success(result));
    });
  };

  /**
   * PATCH /notifications/groups/:groupKey/read
   * Mark all notifications within a group as read.
   */
  markGroupAsRead = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const groupKey = req.params.groupKey;
      const result = await notificationService.markGroupAsRead(authReq.user.id, groupKey);
      res.json(success(result));
    });
  };

  /**
   * DELETE /notifications/:id
   */
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

  /**
   * DELETE /notifications
   * Query: category
   */
  clearAll = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const result = await notificationService.clearAll(authReq.user.id, category);
      res.json(success(result));
    });
  };
}

export const notificationController = new NotificationController();
