import { Notification } from '@prisma/client';
import { notificationRepository, NotificationWithTask } from './notification.repository';
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

interface NotificationResponse {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  taskId: number | null;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  task?: {
    id: number;
    title: string;
  } | null;
}

type NotificationServiceResponse =
  | NotificationResponse
  | { updatedCount: number }
  | { deletedCount: number }
  | { message: string };

export class NotificationService extends BaseService<
  NotificationServiceResponse,
  CreateNotificationInput,
  unknown
> {
  async create(data: CreateNotificationInput): Promise<NotificationResponse> {
    const notification = await notificationRepository.create({
      type: data.type,
      title: data.title,
      message: data.message,
      user: { connect: { id: data.userId } },
      ...(data.taskId ? { task: { connect: { id: data.taskId } } } : {}),
    });
    const fullNotification = await notificationRepository.findByIdForUser(
      notification.id,
      data.userId,
    );

    logger.info(
      `Notification created: ${notification.id} for user ${data.userId}`,
    );

    if (!fullNotification) {
      throw ApiError.notFound(
        ErrorCode.NOTIFICATION_NOT_FOUND,
        'Notification not found',
      );
    }

    return this.formatNotification(fullNotification);
  }

  async getById(id: number): Promise<NotificationResponse> {
    const notification = await notificationRepository.findById(id);
    if (!notification) {
      throw ApiError.notFound(
        ErrorCode.NOTIFICATION_NOT_FOUND,
        'Notification not found',
      );
    }

    return this.formatNotification(notification);
  }

  async getByIdForUser(id: number, userId: number): Promise<NotificationResponse> {
    const notification = await notificationRepository.findByIdForUser(id, userId);
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
      limit?: number;
      cursor?: string;
      isRead?: boolean;
      type?: string;
    },
  ): Promise<{ data: NotificationResponse[]; meta: PaginationMeta & { unreadCount: number } }> {
    const result = await notificationRepository.findByUserId(userId, options);
    const limit = options?.limit || 20;
    const lastNotification = result.data.at(-1);

    return {
      data: result.data.map((notification) => this.formatNotification(notification)),
      meta: {
        ...(lastNotification ? { cursor: String(lastNotification.id) } : {}),
        limit,
        hasMore: result.total > result.data.length + (options?.cursor ? 1 : 0),
        unreadCount: result.unreadCount,
      },
    };
  }

  async markAsRead(id: number, userId: number): Promise<NotificationResponse> {
    const notification = await notificationRepository.findByIdForUser(id, userId);
    if (!notification) {
      throw ApiError.notFound(
        ErrorCode.NOTIFICATION_NOT_FOUND,
        'Notification not found',
      );
    }

    const updated = await notificationRepository.markAsRead(id);
    return this.formatNotification({
      ...notification,
      ...updated,
    });
  }

  async markAllAsRead(userId: number, type?: string): Promise<{ updatedCount: number }> {
    const count = await notificationRepository.markAllAsRead(userId, type);
    logger.info(
      `Marked ${count} notifications as read for user ${userId}`,
    );

    return { updatedCount: count };
  }

  async delete(id: number, userId: number): Promise<{ message: string }> {
    const notification = await notificationRepository.findByIdForUser(id, userId);
    if (!notification) {
      throw ApiError.notFound(
        ErrorCode.NOTIFICATION_NOT_FOUND,
        'Notification not found',
      );
    }

    await notificationRepository.softDelete(id);
    logger.info(`Notification deleted: ${id}`);

    return { message: 'Notification deleted' };
  }

  async clearAll(userId: number, type?: string): Promise<{ deletedCount: number }> {
    const count = await notificationRepository.softDeleteAll(userId, type);
    logger.info(`Cleared ${count} notifications for user ${userId}`);

    return { deletedCount: count };
  }

  private formatNotification(
    notification: Notification | NotificationWithTask,
  ): NotificationResponse {
    const task = 'task' in notification ? notification.task : undefined;

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
      task,
    };
  }

  getAll(
    _options?: ListOptions,
  ): Promise<{ data: NotificationServiceResponse[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  update(_id: number, _data: unknown, ..._args: unknown[]): Promise<NotificationServiceResponse> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }
}

export const notificationService = new NotificationService();
