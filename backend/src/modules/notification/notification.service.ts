import { notificationRepository } from './notification.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions } from '../../types/interfaces';

export interface CreateNotificationInput {
  type: string;
  title: string;
  message: string;
  userId: number;
  taskId?: number;
}

export class NotificationService extends BaseService<
  unknown,
  CreateNotificationInput,
  unknown
> {
  async create(data: CreateNotificationInput) {
    const notification = await notificationRepository.create({
      type: data.type,
      title: data.title,
      message: data.message,
      userId: data.userId,
      taskId: data.taskId,
    } as any);

    logger.info(
      `Notification created: ${notification.id} for user ${data.userId}`,
    );

    return this.formatNotification(notification);
  }

  async getById(id: number) {
    const notification = await notificationRepository.findById(id);
    if (!notification) {
      throw ApiError.notFound(
        ErrorCode.NOTIFICATION_NOT_FOUND,
        'Notification not found',
      );
    }

    return this.formatNotification(notification);
  }

  async getAllForUser(
    userId: number,
    options?: {
      page?: number;
      limit?: number;
      cursor?: string;
      unreadOnly?: boolean;
    },
  ) {
    const result = await notificationRepository.findByUserId(userId, options);

    return {
      data: result.data.map((n: any) => this.formatNotification(n)),
      meta: {
        ...(options?.cursor ? { cursor: options.cursor } : {}),
        limit: options?.limit || 20,
        hasMore: result.data.length === (options?.limit || 20),
        total: result.total,
        unreadCount: result.unreadCount,
      },
    };
  }

  async markAsRead(id: number, userId: number) {
    const notification = await notificationRepository.findById(id);
    if (!notification) {
      throw ApiError.notFound(
        ErrorCode.NOTIFICATION_NOT_FOUND,
        'Notification not found',
      );
    }

    if (notification.userId !== userId) {
      throw ApiError.forbidden(
        ErrorCode.FORBIDDEN_ACCESS,
        'You can only mark your own notifications as read',
      );
    }

    const updated = await notificationRepository.markAsRead(id);
    return this.formatNotification(updated);
  }

  async markAllAsRead(userId: number) {
    const count = await notificationRepository.markAllAsRead(userId);
    logger.info(
      `Marked ${count} notifications as read for user ${userId}`,
    );

    return { markedAsRead: count };
  }

  async delete(id: number, userId: number) {
    const notification = await notificationRepository.findById(id);
    if (!notification) {
      throw ApiError.notFound(
        ErrorCode.NOTIFICATION_NOT_FOUND,
        'Notification not found',
      );
    }

    if (notification.userId !== userId) {
      throw ApiError.forbidden(
        ErrorCode.FORBIDDEN_ACCESS,
        'You can only delete your own notifications',
      );
    }

    await notificationRepository.softDelete(id);
    logger.info(`Notification deleted: ${id}`);

    return { message: 'Notification deleted successfully' };
  }

  async clearAll(userId: number) {
    const count = await notificationRepository.softDeleteAll(userId);
    logger.info(`Cleared ${count} notifications for user ${userId}`);

    return { cleared: count };
  }

  async getUnreadCount(userId: number) {
    const count = await notificationRepository.countUnread(userId);
    return { unreadCount: count };
  }

  private formatNotification(notification: any) {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      taskId: notification.taskId,
      userId: notification.userId,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  getAll(_options?: ListOptions): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  update(_id: number, _data: unknown, ..._args: unknown[]): Promise<unknown> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }
}

export const notificationService = new NotificationService();
