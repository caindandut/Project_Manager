import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';
import { Notification, Prisma } from '@prisma/client';

export class NotificationRepository extends BaseRepository<
  Notification,
  Prisma.NotificationCreateInput,
  Prisma.NotificationUpdateInput
> {
  constructor() {
    super(prisma, prisma.notification);
  }

  async findById(id: number): Promise<Notification | null> {
    return prisma.notification.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByUserId(
    userId: number,
    options?: {
      page?: number;
      limit?: number;
      cursor?: string;
      unreadOnly?: boolean;
    }
  ) {
    const where: any = { userId, deletedAt: null };
    if (options?.unreadOnly) {
      where.isRead = false;
    }

    let skip: number | undefined;
    let take: number | undefined;
    let cursor: { id: number } | undefined;

    if (options?.cursor) {
      cursor = { id: parseInt(options.cursor, 10) };
      take = options.limit || 20;
      skip = 1;
    } else {
      skip = options?.page ? (options.page - 1) * (options.limit || 20) : 0;
      take = options?.limit || 20;
    }

    const [data, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        cursor,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, isRead: false, deletedAt: null },
      }),
    ]);

    return { data, total, unreadCount };
  }

  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return prisma.notification.create({ data });
  }

  async markAsRead(id: number): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false, deletedAt: null },
      data: { isRead: true },
    });
    return result.count;
  }

  async softDelete(id: number): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async softDeleteAll(userId: number): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count;
  }

  async countUnread(userId: number): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false, deletedAt: null },
    });
  }
}

export const notificationRepository = new NotificationRepository();
