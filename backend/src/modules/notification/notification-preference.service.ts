import { notificationPreferenceRepository } from './notification-preference.repository';
import { logger } from '../../common/utils/logger';

interface PreferenceResponse {
  eventType: string;
  eventLabel: string;
  inApp: boolean;
  email: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  TASK_ASSIGNED: 'Được giao công việc',
  TASK_STATUS_CHANGED: 'Thay đổi trạng thái',
  TASK_COMMENTED: 'Bình luận mới',
  TASK_UPDATED: 'Cập nhật công việc',
  MENTION: 'Được @mention',
};

export class NotificationPreferenceService {
  /**
   * Get all preferences for a user, creating defaults if necessary.
   */
  async getPreferences(userId: number): Promise<PreferenceResponse[]> {
    const preferences = await notificationPreferenceRepository.ensureDefaults(userId);

    return preferences.map((p) => ({
      eventType: p.eventType,
      eventLabel: EVENT_LABELS[p.eventType] || p.eventType,
      inApp: p.inApp,
      email: p.email,
    }));
  }

  /**
   * Update preference for a specific event type.
   * Only email toggle is allowed — inApp is always true.
   */
  async updatePreference(
    userId: number,
    eventType: string,
    data: { email?: boolean },
  ): Promise<PreferenceResponse> {
    if (!EVENT_LABELS[eventType]) {
      throw new Error(`Invalid event type: ${eventType}`);
    }

    const pref = await notificationPreferenceRepository.upsert(userId, eventType, data);

    logger.info(
      `Notification preference updated: user ${userId}, event ${eventType}, email=${pref.email}`,
    );

    return {
      eventType: pref.eventType,
      eventLabel: EVENT_LABELS[pref.eventType] || pref.eventType,
      inApp: pref.inApp,
      email: pref.email,
    };
  }

  /**
   * Check if user wants email for a given event type.
   */
  async isEmailEnabled(userId: number, eventType: string): Promise<boolean> {
    return notificationPreferenceRepository.isEmailEnabled(userId, eventType);
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();
