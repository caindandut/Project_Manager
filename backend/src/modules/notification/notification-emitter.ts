import { notificationService, CreateNotificationInput } from './notification.service';
import { notificationPreferenceRepository } from './notification-preference.repository';
import { NotificationType, NotificationCategory } from '../../types/enums';
import { prisma, config } from '../../config';
import { logger } from '../../common/utils/logger';
import { sendNotificationEmail } from '../../common/utils/email.service';

type TaskNotificationData = {
  id: number;
  title: string;
  assigneeId: number | null;
  projectId: number;
  project: {
    workspace: {
      slug: string;
    };
  };
};

export class NotificationEmitter {
  async onTaskAssigned(
    taskId: number,
    assigneeId: number,
    actorId: number,
  ): Promise<void> {
    if (assigneeId === actorId) return;

    try {
      const [task, actor] = await Promise.all([
        this.findTaskForNotification(taskId),
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
      await this.maybeSendEmail(
        assigneeId,
        NotificationType.TASK_ASSIGNED,
        input.title,
        input.message,
        task.title,
        taskId,
        this.buildTaskUrl(task.project.workspace.slug, task.projectId, taskId),
      );
    } catch (err) {
      logger.error('NotificationEmitter.onTaskAssigned failed', err);
    }
  }

  async onTaskStatusChanged(
    taskId: number,
    oldStatus: string,
    newStatus: string,
    actorId: number,
  ): Promise<void> {
    try {
      const [task, actor] = await Promise.all([
        this.findTaskForNotification(taskId),
        prisma.user.findUnique({
          where: { id: actorId },
          select: { id: true, name: true },
        }),
      ]);

      if (!task || !actor) return;

      const statusLabels: Record<string, string> = {
        TODO: 'Cần làm',
        IN_PROGRESS: 'Đang thực hiện',
        REVIEW: 'Đang review',
        DONE: 'Hoàn thành',
        CANCELLED: 'Đã hủy',
      };
      const message = `${actor.name} đã đổi trạng thái "${task.title}" từ ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`;

      await this.notifyTaskRecipients(task, actorId, {
        type: NotificationType.TASK_STATUS_CHANGED,
        category: NotificationCategory.WATCHING,
        title: 'Trạng thái công việc thay đổi',
        message,
        metadata: { action: 'status_changed', oldStatus, newStatus },
      });
    } catch (err) {
      logger.error('NotificationEmitter.onTaskStatusChanged failed', err);
    }
  }

  async onTaskCommented(
    taskId: number,
    commenterId: number,
    commentContent: string,
  ): Promise<void> {
    try {
      const [task, commenter] = await Promise.all([
        this.findTaskForNotification(taskId),
        prisma.user.findUnique({
          where: { id: commenterId },
          select: { id: true, name: true },
        }),
      ]);

      if (!task || !commenter) return;

      const cleanContent = commentContent
        .replace(/@\[([^\]]+)\]\(\d+\)/g, '@$1')
        .substring(0, 100);

      await this.notifyTaskRecipients(task, commenterId, {
        type: NotificationType.TASK_COMMENTED,
        category: NotificationCategory.WATCHING,
        title: 'Bình luận mới',
        message: `${commenter.name} đã bình luận trong "${task.title}": "${cleanContent}"`,
        metadata: { action: 'commented', commentPreview: cleanContent },
      });

      await this.parseMentions(taskId, commentContent, commenterId);
    } catch (err) {
      logger.error('NotificationEmitter.onTaskCommented failed', err);
    }
  }

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

  async onMention(
    taskId: number,
    mentionedUserId: number,
    mentionerId: number,
    _mentionedName?: string,
  ): Promise<void> {
    if (mentionedUserId === mentionerId) return;

    try {
      const [task, mentioner] = await Promise.all([
        this.findTaskForNotification(taskId),
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
        this.buildTaskUrl(task.project.workspace.slug, task.projectId, taskId),
      );
    } catch (err) {
      logger.error('NotificationEmitter.onMention failed', err);
    }
  }

  async onTaskUpdated(
    taskId: number,
    actorId: number,
    changes: Record<string, { old: unknown; new: unknown }>,
  ): Promise<void> {
    try {
      const [task, actor] = await Promise.all([
        this.findTaskForNotification(taskId),
        prisma.user.findUnique({
          where: { id: actorId },
          select: { id: true, name: true },
        }),
      ]);

      if (!task || !actor) return;

      const fieldLabels: Record<string, string> = {
        title: 'tiêu đề',
        description: 'mô tả',
        priority: 'ưu tiên',
        dueDate: 'hạn chót',
        startDate: 'ngày bắt đầu',
        assignees: 'người phụ trách',
      };

      const changedFields = Object.keys(changes)
        .filter((field) => field !== 'status' && field !== 'assignee')
        .map((field) => fieldLabels[field] || field);

      if (changedFields.length === 0) return;

      await this.notifyTaskRecipients(task, actorId, {
        type: NotificationType.TASK_UPDATED,
        category: NotificationCategory.WATCHING,
        title: 'Công việc được cập nhật',
        message: `${actor.name} đã cập nhật ${changedFields.join(', ')} trong "${task.title}"`,
        metadata: { action: 'updated', changes },
      });
    } catch (err) {
      logger.error('NotificationEmitter.onTaskUpdated failed', err);
    }
  }

  async onInvitationReceived(
    invitationId: number,
    workspaceName: string,
    inviterName: string,
    inviteeUserId: number,
    inviterId: number,
  ): Promise<void> {
    try {
      const input: CreateNotificationInput = {
        type: NotificationType.INVITATION_RECEIVED,
        category: NotificationCategory.DIRECT,
        title: 'Lời mời mới',
        message: `${inviterName} đã mời bạn tham gia không gian làm việc "${workspaceName}"`,
        userId: inviteeUserId,
        actorId: inviterId,
        groupKey: `invitation:${invitationId}`,
        metadata: { action: 'invitation_received', invitationId, workspaceName },
      };

      await notificationService.create(input);
    } catch (err) {
      logger.error('NotificationEmitter.onInvitationReceived failed', err);
    }
  }

  private async findTaskForNotification(taskId: number): Promise<TaskNotificationData | null> {
    return prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        assigneeId: true,
        projectId: true,
        project: {
          select: {
            workspace: { select: { slug: true } },
          },
        },
      },
    });
  }

  private async getTaskRecipientIds(taskId: number, fallbackAssigneeId: number | null): Promise<number[]> {
    const ids = new Set<number>();

    try {
      const assignees = await prisma.taskAssignee.findMany({
        where: { taskId },
        select: { userId: true },
      });

      for (const assignee of assignees) {
        ids.add(assignee.userId);
      }
    } catch (error) {
      logger.warn(`Could not read task_assignees for task ${taskId}; falling back to assigneeId.`, error);
    }

    if (fallbackAssigneeId) {
      ids.add(fallbackAssigneeId);
    }

    return Array.from(ids);
  }

  private async notifyTaskRecipients(
    task: TaskNotificationData,
    actorId: number,
    notification: {
      type: NotificationType;
      category: NotificationCategory;
      title: string;
      message: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    const recipientIds = await this.getTaskRecipientIds(task.id, task.assigneeId);
    const taskUrl = this.buildTaskUrl(task.project.workspace.slug, task.projectId, task.id);

    for (const recipientId of recipientIds) {
      if (recipientId === actorId) continue;

      const input: CreateNotificationInput = {
        type: notification.type,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        userId: recipientId,
        taskId: task.id,
        actorId,
        groupKey: `task:${task.id}`,
        metadata: notification.metadata,
      };

      await notificationService.create(input);
      await this.maybeSendEmail(
        recipientId,
        notification.type,
        input.title,
        input.message,
        task.title,
        task.id,
        taskUrl,
      );
    }
  }

  private buildTaskUrl(workspaceSlug: string, projectId: number, taskId: number): string {
    const url = new URL(`/workspaces/${workspaceSlug}/projects/${projectId}/list`, config.CLIENT_URL);
    url.searchParams.set('task', String(taskId));
    return url.toString();
  }

  private async maybeSendEmail(
    userId: number,
    eventType: string,
    subject: string,
    message: string,
    taskTitle: string,
    taskId: number,
    taskUrl: string,
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
        userName: user.name || user.email,
        subject,
        message,
        taskTitle,
        taskId,
        taskUrl,
      });
    } catch (err) {
      logger.error(`Failed to send notification email to user ${userId}`, err);
    }
  }
}

export const notificationEmitter = new NotificationEmitter();
