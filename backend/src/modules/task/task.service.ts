import { taskRepository } from './task.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode, TaskType, TaskPriority, TaskStatus } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import { PaginationMeta, ListOptions } from '../../types/interfaces';

export interface CreateTaskInput {
  title: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  estimatedHours?: number;
  projectId: number;
  assigneeId?: number;
  parentId?: number;
  createdById: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  estimatedHours?: number;
  assigneeId?: number | null;
  order?: number;
}

export interface TaskFilter {
  status?: string;
  priority?: string;
  assigneeId?: number;
  type?: string;
}

export class TaskService extends BaseService<unknown, CreateTaskInput, UpdateTaskInput> {

  async create(data: CreateTaskInput) {
    if (data.parentId) {
      const parent = await taskRepository.findById(data.parentId);
      if (!parent) {
        throw ApiError.notFound(
          ErrorCode.TASK_PARENT_NOT_FOUND,
          'Parent task not found',
        );
      }
      if (parent.parentId) {
        throw ApiError.badRequest(
          ErrorCode.TASK_CANNOT_BE_OWN_SUBTASK,
          'Cannot create subtask under another subtask',
        );
      }
    }

    const task = await taskRepository.create({
      title: data.title,
      description: data.description,
      type: data.type || TaskType.TASK,
      status: data.status || TaskStatus.TODO,
      priority: data.priority || TaskPriority.MEDIUM,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
      projectId: data.projectId,
      assigneeId: data.assigneeId ? { connect: { id: data.assigneeId } } : undefined,
      parentId: data.parentId,
    } as any);

    logger.info(`Task created: ${task.id} in project ${data.projectId}`);

    return this.formatTask(task);
  }

  async createSubTask(
    parentId: number,
    data: { title: string; description?: string; assigneeId?: number },
    userId: number,
  ) {
    const parent = await taskRepository.findById(parentId);
    if (!parent) {
      throw ApiError.notFound(
        ErrorCode.TASK_PARENT_NOT_FOUND,
        'Parent task not found',
      );
    }

    if (parent.type === TaskType.SUB_TASK) {
      throw ApiError.badRequest(
        ErrorCode.TASK_CANNOT_BE_OWN_SUBTASK,
        'Cannot create subtask under another subtask',
      );
    }

    const subtaskCount = await taskRepository.countByProject(parentId);
    if (subtaskCount >= 100) {
      throw ApiError.badRequest(
        ErrorCode.TASK_SUBTASK_LIMIT_EXCEEDED,
        'Maximum subtask limit (100) reached',
      );
    }

    const subtask = await taskRepository.create({
      title: data.title,
      description: data.description,
      type: TaskType.SUB_TASK,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      projectId: parent.projectId,
      parentId: parentId,
      assigneeId: data.assigneeId ? { connect: { id: data.assigneeId } } : undefined,
    } as any);

    logger.info(`Subtask created: ${subtask.id} under parent ${parentId}`);

    return this.formatTask(subtask);
  }

  async getById(id: number) {
    const task = await taskRepository.findByIdWithDetails(id);
    if (!task) {
      throw ApiError.notFound(ErrorCode.TASK_NOT_FOUND, 'Task not found');
    }

    return {
      ...this.formatTask(task),
      project: {
        id: task.project.id,
        name: task.project.name,
        key: task.project.key,
        workspace: {
          id: task.project.workspace.id,
          name: task.project.workspace.name,
        },
      },
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            name: task.assignee.name,
            email: task.assignee.email,
            avatar: task.assignee.avatar,
          }
        : null,
      parent: task.parent
        ? {
            id: task.parent.id,
            title: task.parent.title,
            status: task.parent.status,
          }
        : null,
      subTasks: task.subTasks.map((st: any) => this.formatTask(st)),
      comments: task.comments.map((c: any) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        user: {
          id: c.user.id,
          name: c.user.name,
          email: c.user.email,
          avatar: c.user.avatar,
        },
      })),
      attachments: task.attachments.map((a: any) => ({
        id: a.id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        createdAt: a.createdAt,
        uploadedBy: {
          id: a.uploadedBy.id,
          name: a.uploadedBy.name,
          avatar: a.uploadedBy.avatar,
        },
      })),
    };
  }

  async getAllInProject(
    projectId: number,
    options?: {
      page?: number;
      limit?: number;
      cursor?: string;
      sort?: string;
      filter?: TaskFilter;
    },
  ) {
    let sort: { field: string; direction: 'asc' | 'desc' }[] = [
      { field: 'createdAt', direction: 'desc' },
    ];
    if (options?.sort) {
      sort = options.sort.split(',').map((s) => {
        const [field, direction] = s.split(':');
        return { field, direction: (direction as 'asc' | 'desc') || 'desc' };
      });
    }

    const filter: Record<string, unknown> = {};
    if (options?.filter) {
      if (options.filter.status) filter.status = options.filter.status;
      if (options.filter.priority) filter.priority = options.filter.priority;
      if (options.filter.assigneeId) filter.assigneeId = options.filter.assigneeId;
      if (options.filter.type) filter.type = options.filter.type;
    }

    const result = await taskRepository.findAllInProject(projectId, {
      page: options?.page,
      limit: options?.limit,
      cursor: options?.cursor,
      sort,
      filter,
    });

    const hasMore = result.data.length === (options?.limit || 20);

    return {
      data: result.data.map((t) => ({
        ...this.formatTask(t),
        assignee: t.assignee
          ? {
              id: t.assignee.id,
              name: t.assignee.name,
              avatar: t.assignee.avatar,
            }
          : null,
        subtaskCount: (t as any)._count?.subTasks || 0,
      })),
      meta: {
        ...(options?.cursor ? { cursor: options.cursor } : {}),
        limit: options?.limit || 20,
        hasMore,
        total: result.total,
      },
    };
  }

  async getSubTasks(
    parentId: number,
    options?: { page?: number; limit?: number },
  ) {
    const parent = await taskRepository.findById(parentId);
    if (!parent) {
      throw ApiError.notFound(ErrorCode.TASK_NOT_FOUND, 'Task not found');
    }

    const result = await taskRepository.findSubTasks(parentId, options);

    return {
      data: result.data.map((t: any) => this.formatTask(t)),
      meta: this.buildPaginationMeta(result.total, options?.page, options?.limit),
    };
  }

  async update(id: number, data: UpdateTaskInput) {
    const task = await taskRepository.findById(id);
    if (!task) {
      throw ApiError.notFound(ErrorCode.TASK_NOT_FOUND, 'Task not found');
    }

    const updated = await taskRepository.update(id, data as any);
    return this.formatTask(updated);
  }

  async delete(id: number) {
    const task = await taskRepository.findById(id);
    if (!task) {
      throw ApiError.notFound(ErrorCode.TASK_NOT_FOUND, 'Task not found');
    }

    await taskRepository.deleteWithSubTasks(id);
    logger.info(`Task deleted: ${id}`);

    return { message: 'Task deleted successfully' };
  }

  async logTime(id: number, hours: number) {
    const task = await taskRepository.findById(id);
    if (!task) {
      throw ApiError.notFound(ErrorCode.TASK_NOT_FOUND, 'Task not found');
    }

    const updated = await taskRepository.logTime(id, hours);
    logger.info(`Time logged: ${hours}h for task ${id}`);

    return this.formatTask(updated);
  }

  private formatTask(task: any) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
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

  getAll(_options?: ListOptions): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }
}

export const taskService = new TaskService();
