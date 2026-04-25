import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';
import { Notification, Prisma } from '@prisma/client';

export type NotificationWithTask = Prisma.NotificationGetPayload<{
  include: {
    task: {
      select: {
        id: true;
        title: true;
      };
    };
  };
}>;

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

  async findByIdForUser(
    id: number,
    userId: number,
  ): Promise<NotificationWithTask | null> {
    return prisma.notification.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async findByUserId(
    userId: number,
    options?: {
      limit?: number;
      cursor?: string;
      isRead?: boolean;
      type?: string;
    },
  ) {
    const where: Prisma.NotificationWhereInput = { userId, deletedAt: null };
    if (typeof options?.isRead === 'boolean') {
      where.isRead = options.isRead;
    }
    if (options?.type) {
      where.type = options.type;
    }

    let skip = 0;
    let take = options?.limit || 20;
    let cursor: { id: number } | undefined;

    if (options?.cursor) {
      cursor = { id: parseInt(options.cursor, 10) };
      skip = 1;
    }

    const [data, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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

  async markAllAsRead(userId: number, type?: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false, deletedAt: null, ...(type ? { type } : {}) },
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

  async softDeleteAll(userId: number, type?: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, deletedAt: null, ...(type ? { type } : {}) },
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
