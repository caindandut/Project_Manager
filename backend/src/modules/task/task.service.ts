import { Prisma, Task, TaskPriority, TaskStatus, TaskType } from '@prisma/client';
import { taskRepository, TaskDetail, TaskListItem } from './task.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions } from '../../types/interfaces';
import { prisma } from '../../config';

export interface CreateTaskInput {
  title: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string | Date;
  dueDate?: string | Date;
  estimatedHours?: number;
  projectId: number;
  assigneeId?: number;
  parentId?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string | Date | null;
  dueDate?: string | Date | null;
  estimatedHours?: number;
  assigneeId?: number | null;
  order?: number;
}

export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: number;
  assigneeIdIn?: number[];
  type?: TaskType;
  hasSubtasks?: boolean;
  titleContains?: string;
}

export interface TaskListOptions {
  limit?: number;
  cursor?: string;
  sort?: Prisma.TaskOrderByWithRelationInput[];
  filter?: TaskFilter;
}

export interface TaskDetailOptions {
  includeSubTasks?: boolean;
  includeComments?: boolean;
  includeAttachments?: boolean;
  includeActivities?: boolean;
  commentLimit?: number;
}

export class TaskService extends BaseService<unknown, CreateTaskInput, UpdateTaskInput> {
  async create(data: CreateTaskInput) {
    const project = await taskRepository.findProjectById(data.projectId);
    if (!project) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }

    const type = data.type || TaskType.TASK;
    let parentId: number | null = null;

    if (type === TaskType.SUB_TASK) {
      if (!data.parentId) {
        throw ApiError.badRequest(
          ErrorCode.TASK_PARENT_NOT_FOUND,
          'parentId is required for SUB_TASK',
        );
      }

      const parent = await this.getValidParentTask(data.parentId, data.projectId);
      parentId = parent.id;
    } else if (data.parentId) {
      throw ApiError.badRequest(
        ErrorCode.VALIDATION_ERROR,
        'parentId is only allowed for SUB_TASK',
      );
    }

    if (data.assigneeId) {
      await this.ensureAssigneeInWorkspace(project.workspaceId, data.assigneeId);
    }

    const task = await taskRepository.createTask({
      title: data.title,
      description: data.description,
      type,
      status: data.status || TaskStatus.TODO,
      priority: data.priority || TaskPriority.MEDIUM,
      startDate: data.startDate,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
      projectId: data.projectId,
      assigneeId: data.assigneeId,
      parentId,
    });

    logger.info(`Task created: ${task.id} in project ${data.projectId}`);
    const created = await taskRepository.findListItemById(task.id);
    return created
      ? this.formatTaskWithCounts(created, created.assignee, created._count.subTasks, created._count.comments)
      : this.formatTaskWithCounts(task, null, 0, 0);
  }

  async createSubTask(parentId: number, data: Omit<CreateTaskInput, 'projectId' | 'parentId' | 'type'>) {
    const parent = await taskRepository.findById(parentId);
    if (!parent) {
      throw ApiError.notFound(ErrorCode.TASK_PARENT_NOT_FOUND, 'Parent task not found');
    }

    if (parent.type === TaskType.SUB_TASK || parent.parentId) {
      throw ApiError.badRequest(
        ErrorCode.TASK_CANNOT_BE_OWN_SUBTASK,
        'Cannot create subtask under another subtask',
      );
    }

    return this.create({
      ...data,
      type: TaskType.SUB_TASK,
      projectId: parent.projectId,
      parentId: parent.id,
    });
  }

  async getTaskDetail(id: number, options?: TaskDetailOptions) {
    const task = await taskRepository.findByIdWithDetails(id, {
      includeSubTasks: options?.includeSubTasks ?? true,
      includeComments: options?.includeComments ?? true,
      includeAttachments: options?.includeAttachments ?? true,
      commentLimit: options?.commentLimit || 5,
    });
    if (!task) {
      throw ApiError.notFound(ErrorCode.TASK_NOT_FOUND, 'Task not found');
    }

    return this.formatTaskDetail(task);
  }

  async getAllInProject(projectId: number, options?: TaskListOptions) {
    const project = await taskRepository.findProjectById(projectId);
    if (!project) {
      throw ApiError.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
    }

    const limit = Math.min(Math.max(options?.limit || 20, 1), 100);
    const cursorId = options?.cursor ? this.decodeCursor(options.cursor) : undefined;
    const where = taskRepository.buildWhereFromFilters(options?.filter || {});
    const defaultSort: Prisma.TaskOrderByWithRelationInput[] = [{ order: 'asc' }, { createdAt: 'desc' }];
    const orderBy = options?.sort && options.sort.length > 0
      ? options.sort
      : defaultSort;

    const result = await taskRepository.findAllInProject(projectId, {
      limit: limit + 1,
      cursorId,
      where,
      orderBy,
    });

    const hasMore = result.data.length > limit;
    const data = hasMore ? result.data.slice(0, limit) : result.data;
    const nextCursor = hasMore && data.length > 0
      ? this.encodeCursor(data[data.length - 1].id)
      : undefined;

    return {
      data: data.map((task) => this.formatTaskListItem(task)),
      meta: {
        ...(nextCursor ? { cursor: nextCursor } : {}),
        limit,
        hasMore,
        total: result.total,
      },
    };
  }

  async update(id: number, data: UpdateTaskInput, userId?: number) {
    const task = await this.findTaskWithProjectOrThrow(id);

    if (data.assigneeId !== undefined && data.assigneeId !== null) {
      await this.ensureAssigneeInWorkspace(task.project.workspaceId, data.assigneeId);
    }

    // Parse dates before updating
    const updateData: Prisma.TaskUncheckedUpdateInput = {
      ...data,
      startDate: data.startDate !== undefined
        ? (data.startDate ? new Date(data.startDate) : null)
        : undefined,
      dueDate: data.dueDate !== undefined
        ? (data.dueDate ? new Date(data.dueDate) : null)
        : undefined,
    };

    const updated = await taskRepository.updateTask(id, updateData);

    // Log activity
    if (userId) {
      await this.logTaskActivity(updated, task, userId);
    }

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      priority: updated.priority,
      startDate: updated.startDate,
      dueDate: updated.dueDate,
      updatedAt: updated.updatedAt,
    };
  }

  async updateStatus(id: number, status: TaskStatus, userId?: number) {
    const task = await this.findTaskWithProjectOrThrow(id);
    const previousStatus = task.status;
    const updated = await taskRepository.updateStatus(id, status);

    // Log activity
    if (userId && previousStatus !== status) {
      await prisma.activityLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'TASK',
          entityId: updated.id,
          taskId: updated.id,
          userId,
          metadata: {
            field: 'status',
            oldValue: previousStatus,
            newValue: status,
          } as Prisma.InputJsonValue,
        },
      });
    }

    return updated;
  }

  async assign(id: number, assigneeId: number | null, userId?: number) {
    const task = await this.findTaskWithProjectOrThrow(id);
    const previousAssigneeId = task.assigneeId;

    if (assigneeId !== null) {
      await this.ensureAssigneeInWorkspace(task.project.workspaceId, assigneeId);
    }

    const updated = await taskRepository.updateAssignee(id, assigneeId);

    // Log activity
    if (userId && previousAssigneeId !== assigneeId) {
      await prisma.activityLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'TASK',
          entityId: updated.id,
          taskId: updated.id,
          userId,
          metadata: {
            field: 'assignee',
            oldValue: previousAssigneeId,
            newValue: assigneeId,
          } as Prisma.InputJsonValue,
        },
      });
    }

    return {
      id: updated.id,
      assignee: updated.assignee
        ? {
            id: updated.assignee.id,
            name: updated.assignee.name,
            avatar: updated.assignee.avatar,
          }
        : null,
      updatedAt: updated.updatedAt,
    };
  }

  async delete(id: number) {
    await this.findTaskOrThrow(id);
    const deletedSubTaskCount = await taskRepository.deleteWithSubTasks(id);

    logger.info(`Task deleted: ${id}`);
    return { message: 'Task deleted successfully', deletedSubTaskCount };
  }

  async logTime(id: number, hours: number) {
    await this.findTaskOrThrow(id);
    const updated = await taskRepository.logTime(id, hours);

    logger.info(`Time logged: ${hours}h for task ${id}`);
    return {
      id: updated.id,
      loggedHours: updated.loggedHours,
      estimatedHours: updated.estimatedHours,
      progressPercentage: updated.estimatedHours
        ? Math.min(Math.round((updated.loggedHours / updated.estimatedHours) * 100), 100)
        : null,
    };
  }

  async getById(id: number): Promise<unknown> {
    return this.getTaskDetail(id);
  }

  getAll(_options?: ListOptions): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  private async findTaskOrThrow(id: number): Promise<Task> {
    const task = await taskRepository.findById(id);
    if (!task) {
      throw ApiError.notFound(ErrorCode.TASK_NOT_FOUND, 'Task not found');
    }

    return task;
  }

  private async findTaskWithProjectOrThrow(id: number) {
    const task = await taskRepository.findByIdWithProject(id);
    if (!task) {
      throw ApiError.notFound(ErrorCode.TASK_NOT_FOUND, 'Task not found');
    }

    return task;
  }

  private async getValidParentTask(parentId: number, projectId: number): Promise<Task> {
    const parent = await taskRepository.findById(parentId);
    if (!parent) {
      throw ApiError.notFound(ErrorCode.TASK_PARENT_NOT_FOUND, 'Parent task not found');
    }

    if (parent.projectId !== projectId) {
      throw ApiError.badRequest(
        ErrorCode.TASK_PARENT_NOT_FOUND,
        'Parent task must belong to the same project',
      );
    }

    if (parent.type === TaskType.SUB_TASK || parent.parentId) {
      throw ApiError.badRequest(
        ErrorCode.TASK_CANNOT_BE_OWN_SUBTASK,
        'Cannot create subtask under another subtask',
      );
    }

    return parent;
  }

  private async ensureAssigneeInWorkspace(workspaceId: number, assigneeId: number): Promise<void> {
    const isMember = await taskRepository.isWorkspaceMember(workspaceId, assigneeId);
    if (!isMember) {
      throw ApiError.badRequest(
        ErrorCode.MEMBER_NOT_FOUND,
        'Assignee must be a member of this workspace',
      );
    }
  }

  private formatTask(task: Task) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      startDate: task.startDate,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      loggedHours: task.loggedHours,
      order: task.order,
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      parentId: task.parentId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  private formatTaskWithCounts(
    task: Task,
    assignee: { id: number; name: string; avatar: string | null } | null,
    subTaskCount: number,
    commentCount: number,
  ) {
    return {
      ...this.formatTask(task),
      assignee,
      subTaskCount,
      commentCount,
    };
  }

  private formatTaskListItem(task: TaskListItem) {
    return {
      id: task.id,
      title: task.title,
      type: task.type,
      status: task.status,
      priority: task.priority,
      startDate: task.startDate,
      dueDate: task.dueDate,
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            name: task.assignee.name,
            avatar: task.assignee.avatar,
          }
        : null,
      subTaskCount: task._count.subTasks,
      commentCount: task._count.comments,
      order: task.order,
    };
  }

  private formatTaskDetail(task: TaskDetail) {
    return {
      ...this.formatTask(task),
      project: {
        id: task.project.id,
        name: task.project.name,
        key: task.project.key,
      },
      assignee: task.assignee,
      parent: task.parent,
      subTasks: task.subTasks,
      comments: task.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        user: {
          id: comment.user.id,
          name: comment.user.name,
          avatar: comment.user.avatar,
        },
        createdAt: comment.createdAt,
      })),
      attachments: task.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        uploadedBy: {
          id: attachment.uploadedBy.id,
          name: attachment.uploadedBy.name,
        },
        createdAt: attachment.createdAt,
      })),
      activities: (task.activities || []).map((activity) => {
        const meta = activity.metadata as { field?: string; oldValue?: unknown; newValue?: unknown; fileName?: string } | null;
        return {
          id: activity.id,
          action: activity.action,
          field: meta?.field ?? null,
          oldValue: meta?.oldValue != null ? String(meta.oldValue) : null,
          newValue: meta?.newValue != null ? String(meta.newValue) : null,
          createdAt: activity.createdAt,
          user: {
            id: activity.user.id,
            name: activity.user.name,
            email: '',
            avatar: activity.user.avatar,
          },
          metadata: meta,
        };
      }),
    };
  }

  private async logTaskActivity(
    updated: Task,
    previous: Task & { project: { workspaceId: number } },
    userId: number,
  ): Promise<void> {
    try {
      const changes: Record<string, { old: unknown; new: unknown }> = {};

      if (updated.title !== previous.title) {
        changes['title'] = { old: previous.title ?? null, new: updated.title ?? null };
      }
      if (updated.description !== previous.description) {
        changes['description'] = { old: previous.description ?? null, new: updated.description ?? null };
      }
      if (updated.status !== previous.status) {
        changes['status'] = { old: previous.status, new: updated.status };
      }
      if (updated.priority !== previous.priority) {
        changes['priority'] = { old: previous.priority, new: updated.priority };
      }
      if (updated.dueDate?.getTime() !== previous.dueDate?.getTime()) {
        changes['dueDate'] = {
          old: previous.dueDate?.toISOString() ?? null,
          new: updated.dueDate?.toISOString() ?? null,
        };
      }
      if (updated.startDate?.getTime() !== previous.startDate?.getTime()) {
        changes['startDate'] = {
          old: previous.startDate?.toISOString() ?? null,
          new: updated.startDate?.toISOString() ?? null,
        };
      }
      if (updated.assigneeId !== previous.assigneeId) {
        changes['assignee'] = {
          old: previous.assigneeId ?? null,
          new: updated.assigneeId ?? null,
        };
      }

      for (const [field, change] of Object.entries(changes)) {
        await prisma.activityLog.create({
          data: {
            action: 'UPDATE',
            entityType: 'TASK',
            entityId: updated.id,
            taskId: updated.id,
            userId,
            metadata: {
              field,
              oldValue: change.old ?? null,
              newValue: change.new ?? null,
            } as Prisma.InputJsonValue,
          },
        });
      }
    } catch (err) {
      logger.error('Failed to log task activity', err);
    }
  }

  private encodeCursor(id: number): string {
    return Buffer.from(JSON.stringify({ id })).toString('base64');
  }

  private decodeCursor(cursor: string): number {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as { id?: unknown };
      if (typeof parsed.id !== 'number') {
        throw new Error('Invalid cursor');
      }

      return parsed.id;
    } catch {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid cursor');
    }
  }
}

export const taskService = new TaskService();
