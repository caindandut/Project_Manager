import { notificationService, CreateNotificationInput } from './notification.service';
import { notificationPreferenceRepository } from './notification-preference.repository';
import { NotificationType, NotificationCategory } from '../../types/enums';
import { prisma } from '../../config';
import { logger } from '../../common/utils/logger';
import { sendNotificationEmail } from '../../common/utils/email.service';

/**
 * NotificationEmitter — called from task/comment services to automatically
 * create in-app notifications and optionally send email notifications.
 *
 * Category rules:
 *   DIRECT:   TASK_ASSIGNED, MENTION
 *   WATCHING: TASK_STATUS_CHANGED, TASK_COMMENTED, TASK_UPDATED
 */
export class NotificationEmitter {
  /**
   * Task was assigned to a user.
   */
  async onTaskAssigned(
    taskId: number,
    assigneeId: number,
    actorId: number,
  ): Promise<void> {
    // Don't notify yourself
    if (assigneeId === actorId) return;

    try {
      const [task, actor] = await Promise.all([
        prisma.task.findUnique({
          where: { id: taskId },
          select: { id: true, title: true, projectId: true },
        }),
        prisma.user.findUnique({
          where: { id: actorId },
          select: { id: true, name: true },
        }),
      ]);

      if (!task || !actor) return;

      const input: CreateNotificationInput = {
        type: NotificationType.TASK_ASSIGNED,
        category: NotificationCategory.DIRECT,
        title: 'Được giao công việc mới',
        message: `${actor.name} đã giao cho bạn công việc "${task.title}"`,
        userId: assigneeId,
        taskId,
        actorId,
        groupKey: `task:${taskId}`,
        metadata: { action: 'assigned' },
      };

      await notificationService.create(input);

      // Check email preference
      await this.maybeSendEmail(
        assigneeId,
        NotificationType.TASK_ASSIGNED,
        input.title,
        input.message,
        task.title,
        taskId,
      );
    } catch (err) {
      logger.error('NotificationEmitter.onTaskAssigned failed', err);
    }
  }

  /**
   * Task status changed — notify the assignee (WATCHING).
   */
  async onTaskStatusChanged(
    taskId: number,
    oldStatus: string,
    newStatus: string,
    actorId: number,
  ): Promise<void> {
    try {
      const [task, actor] = await Promise.all([
        prisma.task.findUnique({
          where: { id: taskId },
          select: { id: true, title: true, assigneeId: true, projectId: true },
        }),
        prisma.user.findUnique({
          where: { id: actorId },
          select: { id: true, name: true },
        }),
      ]);

      if (!task || !actor || !task.assigneeId) return;
      if (task.assigneeId === actorId) return;

      const statusLabels: Record<string, string> = {
        TODO: 'Cần làm',
        IN_PROGRESS: 'Đang thực hiện',
        REVIEW: 'Đang review',
        DONE: 'Hoàn thành',
        CANCELLED: 'Đã hủy',
      };

      const input: CreateNotificationInput = {
        type: NotificationType.TASK_STATUS_CHANGED,
        category: NotificationCategory.WATCHING,
        title: 'Trạng thái công việc thay đổi',
        message: `${actor.name} đã đổi trạng thái "${task.title}" từ ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`,
        userId: task.assigneeId,
        taskId,
        actorId,
        groupKey: `task:${taskId}`,
        metadata: { action: 'status_changed', oldStatus, newStatus },
      };

      await notificationService.create(input);

      await this.maybeSendEmail(
        task.assigneeId,
        NotificationType.TASK_STATUS_CHANGED,
        input.title,
        input.message,
        task.title,
        taskId,
      );
    } catch (err) {
      logger.error('NotificationEmitter.onTaskStatusChanged failed', err);
    }
  }

  /**
   * New comment on a task — notify the assignee (WATCHING).
   */
  async onTaskCommented(
    taskId: number,
    commenterId: number,
    commentContent: string,
  ): Promise<void> {
    try {
      const [task, commenter] = await Promise.all([
        prisma.task.findUnique({
          where: { id: taskId },
          select: { id: true, title: true, assigneeId: true, projectId: true },
        }),
        prisma.user.findUnique({
          where: { id: commenterId },
          select: { id: true, name: true },
        }),
      ]);

      if (!task || !commenter || !task.assigneeId) return;
      if (task.assigneeId === commenterId) return;

      // Strip @mention format for display
      const cleanContent = commentContent
        .replace(/@\[([^\]]+)\]\(\d+\)/g, '@$1')
        .substring(0, 100);

      const input: CreateNotificationInput = {
        type: NotificationType.TASK_COMMENTED,
        category: NotificationCategory.WATCHING,
        title: 'Bình luận mới',
        message: `${commenter.name} đã bình luận trong "${task.title}": "${cleanContent}"`,
        userId: task.assigneeId,
        taskId,
        actorId: commenterId,
        groupKey: `task:${taskId}`,
        metadata: { action: 'commented', commentPreview: cleanContent },
      };

      await notificationService.create(input);

      await this.maybeSendEmail(
        task.assigneeId,
        NotificationType.TASK_COMMENTED,
        input.title,
        input.message,
        task.title,
        taskId,
      );

      // Parse @mentions in comment content
      await this.parseMentions(taskId, commentContent, commenterId);
    } catch (err) {
      logger.error('NotificationEmitter.onTaskCommented failed', err);
    }
  }

  /**
   * Parse @[Name](userId) mentions and send DIRECT notifications.
   */
  async parseMentions(
    taskId: number,
    content: string,
    mentionerId: number,
  ): Promise<void> {
    const mentionRegex = /@\[([^\]]+)\]\((\d+)\)/g;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedName = match[1];
      const mentionedUserId = parseInt(match[2], 10);

      await this.onMention(taskId, mentionedUserId, mentionerId, mentionedName);
    }
  }

  /**
   * User was @mentioned — DIRECT notification.
   */
  async onMention(
    taskId: number,
    mentionedUserId: number,
    mentionerId: number,
    _mentionedName?: string,
  ): Promise<void> {
    if (mentionedUserId === mentionerId) return;

    try {
      const [task, mentioner] = await Promise.all([
        prisma.task.findUnique({
          where: { id: taskId },
          select: { id: true, title: true, projectId: true },
        }),
        prisma.user.findUnique({
          where: { id: mentionerId },
          select: { id: true, name: true },
        }),
      ]);

      if (!task || !mentioner) return;

      const input: CreateNotificationInput = {
        type: NotificationType.MENTION,
        category: NotificationCategory.DIRECT,
        title: 'Bạn được nhắc đến',
        message: `${mentioner.name} đã nhắc đến bạn trong "${task.title}"`,
        userId: mentionedUserId,
        taskId,
        actorId: mentionerId,
        groupKey: `task:${taskId}`,
        metadata: { action: 'mention' },
      };

      await notificationService.create(input);

      await this.maybeSendEmail(
        mentionedUserId,
        NotificationType.MENTION,
        input.title,
        input.message,
        task.title,
        taskId,
      );
    } catch (err) {
      logger.error('NotificationEmitter.onMention failed', err);
    }
  }

  /**
   * Task was updated (generic field change) — notify assignee (WATCHING).
   */
  async onTaskUpdated(
    taskId: number,
    actorId: number,
    changes: Record<string, { old: unknown; new: unknown }>,
  ): Promise<void> {
    try {
      const [task, actor] = await Promise.all([
        prisma.task.findUnique({
          where: { id: taskId },
          select: { id: true, title: true, assigneeId: true, projectId: true },
        }),
        prisma.user.findUnique({
          where: { id: actorId },
          select: { id: true, name: true },
        }),
      ]);

      if (!task || !actor || !task.assigneeId) return;
      if (task.assigneeId === actorId) return;

      const fieldLabels: Record<string, string> = {
        title: 'tiêu đề',
        description: 'mô tả',
        priority: 'ưu tiên',
        dueDate: 'hạn chót',
        startDate: 'ngày bắt đầu',
      };

      const changedFields = Object.keys(changes)
        .filter((f) => f !== 'status' && f !== 'assignee')
        .map((f) => fieldLabels[f] || f);

      if (changedFields.length === 0) return;

      const input: CreateNotificationInput = {
        type: NotificationType.TASK_UPDATED,
        category: NotificationCategory.WATCHING,
        title: 'Công việc được cập nhật',
        message: `${actor.name} đã cập nhật ${changedFields.join(', ')} trong "${task.title}"`,
        userId: task.assigneeId,
        taskId,
        actorId,
        groupKey: `task:${taskId}`,
        metadata: { action: 'updated', changes },
      };

      await notificationService.create(input);

      await this.maybeSendEmail(
        task.assigneeId,
        NotificationType.TASK_UPDATED,
        input.title,
        input.message,
        task.title,
        taskId,
      );
    } catch (err) {
      logger.error('NotificationEmitter.onTaskUpdated failed', err);
    }
  }

  // ── Private helpers ─────────────────────────────────────────

  private async maybeSendEmail(
    userId: number,
    eventType: string,
    subject: string,
    message: string,
    taskTitle: string,
    taskId: number,
  ): Promise<void> {
    try {
      const wantsEmail = await notificationPreferenceRepository.isEmailEnabled(userId, eventType);
      if (!wantsEmail) return;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (!user) return;

      await sendNotificationEmail({
        to: user.email,
        userName: user.name,
        subject,
        message,
        taskTitle,
        taskId,
      });
    } catch (err) {
      logger.error(`Failed to send notification email to user ${userId}`, err);
    }
  }
}

export const notificationEmitter = new NotificationEmitter();
