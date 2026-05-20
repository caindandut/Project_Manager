import { Notification, Prisma } from '@prisma/client';
import { notificationRepository, NotificationWithRelations, GroupedNotification } from './notification.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions } from '../../types/interfaces';

// ── Input / Response types ────────────────────────────────────────

export interface CreateNotificationInput {
  type: string;
  category: string;
  title: string;
  message: string;
  userId: number;
  taskId?: number;
  actorId?: number;
  groupKey?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationResponse {
  id: number;
  type: string;
  category: string;
  title: string;
  message: string;
  isRead: boolean;
  taskId: number | null;
  userId: number;
  groupKey: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  task?: { id: number; title: string; projectId: number } | null;
  actor?: { id: number; name: string; avatar: string | null } | null;
}

export interface GroupedNotificationResponse {
  groupKey: string;
  notification: NotificationResponse;
  count: number;
  hasUnread: boolean;
}

type NotificationServiceResponse =
  | NotificationResponse
  | { updatedCount: number }
  | { deletedCount: number }
  | { message: string };

// ── Service ───────────────────────────────────────────────────────

export class NotificationService extends BaseService<
  NotificationServiceResponse,
  CreateNotificationInput,
  unknown
> {
  async create(data: CreateNotificationInput): Promise<NotificationResponse> {
    const createInput: Prisma.NotificationCreateInput = {
      type: data.type,
      category: data.category,
      title: data.title,
      message: data.message,
      groupKey: data.groupKey,
      metadata: data.metadata as Prisma.InputJsonValue,
      user: { connect: { id: data.userId } },
      ...(data.taskId ? { task: { connect: { id: data.taskId } } } : {}),
      ...(data.actorId ? { actor: { connect: { id: data.actorId } } } : {}),
    };

    const notification = await notificationRepository.create(createInput);
    const fullNotification = await notificationRepository.findByIdForUser(
      notification.id,
      data.userId,
    );

    logger.info(
      `Notification created: ${notification.id} [${data.category}/${data.type}] for user ${data.userId}`,
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

  /**
   * Get flat (non-grouped) notification list for a user.
   */
  async getAllForUser(
    userId: number,
    options?: {
      limit?: number;
      cursor?: string;
      isRead?: boolean;
      type?: string;
      category?: string;
    },
  ): Promise<{ data: NotificationResponse[]; meta: PaginationMeta & { unreadCount: number } }> {
    const result = await notificationRepository.findByUserId(userId, options);
    const limit = options?.limit || 20;
    const lastNotification = result.data.at(-1);

    return {
      data: result.data.map((n) => this.formatNotification(n)),
      meta: {
        ...(lastNotification ? { cursor: String(lastNotification.id) } : {}),
        limit,
        hasMore: result.total > result.data.length + (options?.cursor ? 1 : 0),
        unreadCount: result.unreadCount,
      },
    };
  }

  /**
   * Get grouped notifications for the dropdown — each group shows the latest
   * notification with a count of total changes.
   */
  async getGroupedForUser(
    userId: number,
    options?: {
      limit?: number;
      category?: string;
      isRead?: boolean;
    },
  ): Promise<{ data: GroupedNotificationResponse[]; meta: { total: number; unreadCount: number } }> {
    const result = await notificationRepository.findGroupedByUserId(userId, {
      limit: options?.limit || 10,
      category: options?.category,
      isRead: options?.isRead,
    });

    return {
      data: result.data.map((g) => ({
        groupKey: g.groupKey,
        notification: this.formatNotification(g.latestNotification),
        count: g.count,
        hasUnread: g.hasUnread,
      })),
      meta: {
        total: result.total,
        unreadCount: result.unreadCount,
      },
    };
  }

  /**
   * Get all notifications within a group, ordered chronologically.
   */
  async getGroupDetail(
    userId: number,
    groupKey: string,
  ): Promise<NotificationResponse[]> {
    const notifications = await notificationRepository.findByGroupKey(userId, groupKey);
    return notifications.map((n) => this.formatNotification(n));
  }

  /**
   * Get unread count — DIRECT only (for badge).
   */
  async getUnreadDirectCount(userId: number): Promise<number> {
    return notificationRepository.countUnread(userId, 'DIRECT');
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
    return this.formatNotification({ ...notification, ...updated });
  }

  async markGroupAsRead(userId: number, groupKey: string): Promise<{ updatedCount: number }> {
    const count = await notificationRepository.markGroupAsRead(userId, groupKey);
    return { updatedCount: count };
  }

  async markAllAsRead(userId: number, category?: string): Promise<{ updatedCount: number }> {
    const count = await notificationRepository.markAllAsRead(userId, category);
    logger.info(
      `Marked ${count} notifications as read for user ${userId}${category ? ` [${category}]` : ''}`,
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

  async clearAll(userId: number, category?: string): Promise<{ deletedCount: number }> {
    const count = await notificationRepository.softDeleteAll(userId, category);
    logger.info(`Cleared ${count} notifications for user ${userId}`);
    return { deletedCount: count };
  }

  // ── Formatting ────────────────────────────────────────────────

  private formatNotification(
    notification: Notification | NotificationWithRelations,
  ): NotificationResponse {
    const task = 'task' in notification ? notification.task : undefined;
    const actor = 'actor' in notification ? notification.actor : undefined;

    return {
      id: notification.id,
      type: notification.type,
      category: notification.category,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      taskId: notification.taskId,
      userId: notification.userId,
      groupKey: notification.groupKey,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      task: task ?? null,
      actor: actor ?? null,
    };
  }

  // ── Abstract stubs ────────────────────────────────────────────

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
