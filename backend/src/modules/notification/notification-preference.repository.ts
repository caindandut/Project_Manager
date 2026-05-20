import { prisma } from '../../config';
import { NotificationPreference, Prisma } from '@prisma/client';

export class NotificationPreferenceRepository {
  private readonly defaultEventTypes = [
    'TASK_ASSIGNED',
    'TASK_STATUS_CHANGED',
    'TASK_COMMENTED',
    'TASK_UPDATED',
    'MENTION',
  ];

  async findByUserId(userId: number): Promise<NotificationPreference[]> {
    return prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { eventType: 'asc' },
    });
  }

  async findByUserAndEvent(
    userId: number,
    eventType: string,
  ): Promise<NotificationPreference | null> {
    return prisma.notificationPreference.findUnique({
      where: { uq_notification_pref_user_event: { userId, eventType } },
    });
  }

  async upsert(
    userId: number,
    eventType: string,
    data: { email?: boolean },
  ): Promise<NotificationPreference> {
    return prisma.notificationPreference.upsert({
      where: { uq_notification_pref_user_event: { userId, eventType } },
      create: {
        userId,
        eventType,
        inApp: true,
        email: data.email ?? false,
      },
      update: {
        ...(data.email !== undefined ? { email: data.email } : {}),
      },
    });
  }

  /**
   * Ensure all default event types have preferences for a user.
   * Creates missing ones with default values.
   */
  async ensureDefaults(userId: number): Promise<NotificationPreference[]> {
    const existing = await this.findByUserId(userId);
    const existingTypes = new Set(existing.map((p) => p.eventType));

    const missing = this.defaultEventTypes.filter((t) => !existingTypes.has(t));

    if (missing.length > 0) {
      await prisma.notificationPreference.createMany({
        data: missing.map((eventType) => ({
          userId,
          eventType,
          inApp: true,
          email: false,
        })),
        skipDuplicates: true,
      });

      return this.findByUserId(userId);
    }

    return existing;
  }

  /**
   * Check if a user wants email notification for a specific event type.
   */
  async isEmailEnabled(userId: number, eventType: string): Promise<boolean> {
    const pref = await this.findByUserAndEvent(userId, eventType);
    return pref?.email ?? false;
  }
}

export const notificationPreferenceRepository = new NotificationPreferenceRepository();
