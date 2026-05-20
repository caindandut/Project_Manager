import { BaseRepository } from '../../common/base/BaseRepository';
import { prisma } from '../../config';
import { Notification, Prisma } from '@prisma/client';

// ── Prisma payload types ──────────────────────────────────────────
export type NotificationWithRelations = Prisma.NotificationGetPayload<{
  include: {
    task: { select: { id: true; title: true; projectId: true } };
    actor: { select: { id: true; name: true; avatar: true } };
  };
}>;

// ── Grouped notification type ─────────────────────────────────────
export interface GroupedNotification {
  groupKey: string;
  latestNotification: NotificationWithRelations;
  count: number;
  hasUnread: boolean;
}

// ── Repository ────────────────────────────────────────────────────
export class NotificationRepository extends BaseRepository<
  Notification,
  Prisma.NotificationCreateInput,
  Prisma.NotificationUpdateInput
> {
  constructor() {
    super(prisma, prisma.notification);
  }

  private readonly defaultInclude = {
    task: { select: { id: true, title: true, projectId: true } },
    actor: { select: { id: true, name: true, avatar: true } },
  } as const;

  // ── Read ──────────────────────────────────────────────────────

  async findById(id: number): Promise<Notification | null> {
    return prisma.notification.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdForUser(
    id: number,
    userId: number,
  ): Promise<NotificationWithRelations | null> {
    return prisma.notification.findFirst({
      where: { id, userId, deletedAt: null },
      include: this.defaultInclude,
    });
  }

  async findByUserId(
    userId: number,
    options?: {
      limit?: number;
      cursor?: string;
      isRead?: boolean;
      type?: string;
      category?: string;
    },
  ) {
    const where: Prisma.NotificationWhereInput = { userId, deletedAt: null };
    if (typeof options?.isRead === 'boolean') {
      where.isRead = options.isRead;
    }
    if (options?.type) {
      where.type = options.type;
    }
    if (options?.category) {
      where.category = options.category;
    }

    let skip = 0;
    const take = options?.limit || 20;
    let cursor: { id: number } | undefined;

    if (options?.cursor) {
      cursor = { id: parseInt(options.cursor, 10) };
      skip = 1;
    }

    const [data, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: this.defaultInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        cursor,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, isRead: false, deletedAt: null, ...(options?.category ? { category: options.category } : {}) },
      }),
    ]);

    return { data, total, unreadCount };
  }

  /**
   * Get grouped notifications: aggregate by groupKey, return the latest notification
   * per group along with count and unread status.
   */
  async findGroupedByUserId(
    userId: number,
    options?: {
      limit?: number;
      cursor?: string;
      category?: string;
      isRead?: boolean;
    },
  ): Promise<{ data: GroupedNotification[]; total: number; unreadCount: number }> {
    const categoryFilter = options?.category ? `AND n.category = '${options.category}'` : '';
    const readFilter = typeof options?.isRead === 'boolean'
      ? `AND n.is_read = ${options.isRead ? 1 : 0}`
      : '';

    // Use raw query for grouping — get the latest notification ID per groupKey
    const groupedRows = await prisma.$queryRawUnsafe<Array<{
      group_key: string;
      latest_id: number;
      cnt: bigint;
      has_unread: number;
    }>>(
      `SELECT 
        COALESCE(n.group_key, CAST(n.id AS CHAR)) as group_key,
        MAX(n.id) as latest_id,
        COUNT(*) as cnt,
        MAX(CASE WHEN n.is_read = 0 THEN 1 ELSE 0 END) as has_unread
      FROM notifications n
      WHERE n.user_id = ? AND n.deleted_at IS NULL ${categoryFilter} ${readFilter}
      GROUP BY COALESCE(n.group_key, CAST(n.id AS CHAR))
      ORDER BY latest_id DESC
      LIMIT ?`,
      userId,
      options?.limit || 10,
    );

    // Fetch full notification details for each group's latest notification
    const latestIds = groupedRows.map((r) => r.latest_id);

    let latestNotifications: NotificationWithRelations[] = [];
    if (latestIds.length > 0) {
      latestNotifications = await prisma.notification.findMany({
        where: { id: { in: latestIds }, deletedAt: null },
        include: this.defaultInclude,
        orderBy: [{ createdAt: 'desc' }],
      });
    }

    const notificationMap = new Map(latestNotifications.map((n) => [n.id, n]));

    const data: GroupedNotification[] = groupedRows
      .map((row) => {
        const notification = notificationMap.get(row.latest_id);
        if (!notification) return null;
        return {
          groupKey: row.group_key,
          latestNotification: notification,
          count: Number(row.cnt),
          hasUnread: row.has_unread === 1,
        };
      })
      .filter(Boolean) as GroupedNotification[];

    // Get total unique groups count
    const totalResult = await prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
      `SELECT COUNT(DISTINCT COALESCE(n.group_key, CAST(n.id AS CHAR))) as cnt
       FROM notifications n
       WHERE n.user_id = ? AND n.deleted_at IS NULL ${categoryFilter} ${readFilter}`,
      userId,
    );
    const total = Number(totalResult[0]?.cnt ?? 0);

    // Unread count — DIRECT only (for badge)
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false, deletedAt: null, category: 'DIRECT' },
    });

    return { data, total, unreadCount };
  }

  /**
   * Get all notifications in a specific group (by groupKey) for detail view.
   */
  async findByGroupKey(
    userId: number,
    groupKey: string,
  ): Promise<NotificationWithRelations[]> {
    return prisma.notification.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { groupKey },
          // Single notifications without groupKey use their id as key
          ...(groupKey.match(/^\d+$/) ? [{ id: parseInt(groupKey, 10), groupKey: null }] : []),
        ],
      },
      include: this.defaultInclude,
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  // ── Write ─────────────────────────────────────────────────────

  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return prisma.notification.create({ data });
  }

  async markAsRead(id: number): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number, category?: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
        ...(category ? { category } : {}),
      },
      data: { isRead: true },
    });
    return result.count;
  }

  async markGroupAsRead(userId: number, groupKey: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
        OR: [
          { groupKey },
          ...(groupKey.match(/^\d+$/) ? [{ id: parseInt(groupKey, 10), groupKey: null }] : []),
        ],
      },
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

  async softDeleteAll(userId: number, category?: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, deletedAt: null, ...(category ? { category } : {}) },
      data: { deletedAt: new Date() },
    });
    return result.count;
  }

  async countUnread(userId: number, category?: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
        ...(category ? { category } : {}),
      },
    });
  }
}

export const notificationRepository = new NotificationRepository();
