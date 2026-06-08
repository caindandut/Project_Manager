import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import {
  MyTasksActivityRecord,
  MyTasksDueFilter,
  MyTasksQuery,
  MyTasksRoleFilter,
  MyTasksSortField,
  MyTasksStats,
  MyTasksTab,
  MyTasksTaskRecord,
} from './my-tasks.interface';
import { myTasksRepository } from './my-tasks.repository';

export interface MyTasksResponse {
  tasks: ReturnType<MyTasksService['formatTask']>[];
  activities: ReturnType<MyTasksService['formatActivity']>[];
  stats: MyTasksStats;
  filters: {
    projects: Array<{ id: number; name: string; key: string }>;
    statuses: TaskStatus[];
    priorities: TaskPriority[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class MyTasksService {
  async getWorkspaceMyTasks(
    workspaceId: number,
    userId: number,
    query: MyTasksQuery,
  ): Promise<MyTasksResponse> {
    const createdTaskIds = await myTasksRepository.findCreatedTaskIds(workspaceId, userId);
    const assignedTaskIds = await myTasksRepository.findAssignedTaskIds(userId, workspaceId);
    const where = this.buildWhere(workspaceId, userId, createdTaskIds, assignedTaskIds, query);
    const orderBy = this.getOrderBy(query.tab, query.sort);
    const activityLimit = query.tab === 'activity' ? query.limit : 10;

    const [taskResult, activities, stats, projects] = await Promise.all([
      myTasksRepository.findTasks({
        where,
        orderBy,
        page: query.page,
        limit: query.limit,
      }),
      myTasksRepository.findActivities(workspaceId, userId, query.tab === 'activity' ? query.page : 1, activityLimit),
      myTasksRepository.getStats(workspaceId, userId, createdTaskIds, assignedTaskIds),
      myTasksRepository.findFilterProjects(workspaceId, userId, createdTaskIds),
    ]);

    return {
      tasks: taskResult.data.map((task) => this.formatTask(task, userId, createdTaskIds)),
      activities: activities.map((activity) => this.formatActivity(activity)),
      stats,
      filters: {
        projects,
        statuses: Object.values(TaskStatus),
        priorities: Object.values(TaskPriority),
      },
      pagination: {
        page: query.page,
        limit: query.limit,
        total: query.tab === 'activity' ? stats.activityCount : taskResult.total,
        totalPages: Math.ceil((query.tab === 'activity' ? stats.activityCount : taskResult.total) / query.limit),
      },
    };
  }

  buildQuery(raw: Record<string, unknown>): MyTasksQuery {
    const tab = this.parseEnum<MyTasksTab>(raw.tab, ['inbox', 'board', 'list', 'activity'], 'inbox');
    const due = this.parseOptionalEnum<MyTasksDueFilter>(raw.due, ['overdue', 'today', 'week', 'none']);
    const role = this.parseEnum<MyTasksRoleFilter>(raw.role, ['assigned', 'created', 'all'], 'all');
    const sort = this.parseEnum<MyTasksSortField>(raw.sort, ['dueDate', 'updatedAt', 'priority'], 'dueDate');
    const status = this.parseOptionalTaskStatus(raw.status);
    const priority = this.parseOptionalTaskPriority(raw.priority);
    const projectId = this.parseOptionalPositiveInt(raw.projectId, 'projectId');
    const page = this.parsePositiveInt(raw.page, 1, 1, 10_000, 'page');
    const limit = this.parsePositiveInt(raw.limit, tab === 'board' ? 200 : 50, 1, 200, 'limit');
    const q = typeof raw.q === 'string' && raw.q.trim() ? raw.q.trim() : undefined;

    return {
      tab,
      q,
      projectId,
      status,
      priority,
      due,
      role,
      sort,
      page,
      limit,
    };
  }

  private buildWhere(
    workspaceId: number,
    userId: number,
    createdTaskIds: number[],
    assignedTaskIds: number[],
    query: MyTasksQuery,
  ): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {
      ...myTasksRepository.buildRelatedWhere(workspaceId, userId, createdTaskIds, assignedTaskIds),
    };

    if (query.role === 'assigned') {
      where.OR = [
        { assigneeId: userId },
        ...(assignedTaskIds.length > 0 ? [{ id: { in: assignedTaskIds } }] : []),
      ];
    }

    if (query.role === 'created') {
      where.id = createdTaskIds.length > 0 ? { in: createdTaskIds } : { in: [-1] };
      delete where.OR;
    }

    if (query.tab === 'inbox') {
      where.status = { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] };
    }

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.status) {
      where.status = query.status as TaskStatus;
    }

    if (query.priority) {
      where.priority = query.priority as TaskPriority;
    }

    if (query.q) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { title: { contains: query.q } },
            { description: { contains: query.q } },
            { project: { name: { contains: query.q } } },
            { project: { key: { contains: query.q } } },
          ],
        },
      ];
    }

    const dueWhere = this.getDueWhere(query.due);
    if (dueWhere) {
      where.dueDate = dueWhere;
    }

    return where;
  }

  private getOrderBy(
    tab: MyTasksTab,
    sort: MyTasksSortField,
  ): Prisma.TaskOrderByWithRelationInput[] {
    if (tab === 'inbox') {
      return [
        { dueDate: 'asc' },
        { priority: 'desc' },
        { updatedAt: 'desc' },
      ];
    }

    if (sort === 'priority') {
      return [{ priority: 'desc' }, { dueDate: 'asc' }, { updatedAt: 'desc' }];
    }

    if (sort === 'updatedAt') {
      return [{ updatedAt: 'desc' }, { dueDate: 'asc' }];
    }

    return [{ dueDate: 'asc' }, { updatedAt: 'desc' }];
  }

  private getDueWhere(due?: MyTasksDueFilter): Prisma.DateTimeNullableFilter | undefined {
    if (!due) return undefined;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    todayEnd.setMilliseconds(todayEnd.getMilliseconds() - 1);
    const weekEnd = new Date(todayEnd);
    weekEnd.setDate(weekEnd.getDate() + 6);

    if (due === 'overdue') return { lt: todayStart };
    if (due === 'today') return { gte: todayStart, lte: todayEnd };
    if (due === 'week') return { gte: todayStart, lte: weekEnd };
    return { equals: null };
  }

  formatTask(task: MyTasksTaskRecord, userId: number, createdTaskIds: number[]) {
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
      project: task.project,
      assignee: task.assignee,
      assignees: task.assignees,
      subTaskCount: task._count.subTasks,
      commentCount: task._count.comments,
      assignedToMe: task.assigneeId === userId || task.assignees.some((assignee) => assignee.id === userId),
      createdByMe: createdTaskIds.includes(task.id),
    };
  }

  formatActivity(activity: MyTasksActivityRecord) {
    const metadata = activity.metadata as { field?: string; oldValue?: unknown; newValue?: unknown } | null;

    return {
      id: activity.id,
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId,
      field: metadata?.field ?? null,
      oldValue: metadata?.oldValue != null ? String(metadata.oldValue) : null,
      newValue: metadata?.newValue != null ? String(metadata.newValue) : null,
      createdAt: activity.createdAt,
      user: activity.user,
      task: activity.task,
      metadata,
    };
  }

  private parseOptionalTaskStatus(value: unknown): TaskStatus | undefined {
    if (typeof value !== 'string' || value.trim() === '') return undefined;
    if (!Object.values(TaskStatus).includes(value as TaskStatus)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid status filter');
    }
    return value as TaskStatus;
  }

  private parseOptionalTaskPriority(value: unknown): TaskPriority | undefined {
    if (typeof value !== 'string' || value.trim() === '') return undefined;
    if (!Object.values(TaskPriority).includes(value as TaskPriority)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid priority filter');
    }
    return value as TaskPriority;
  }

  private parseEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    if (typeof value !== 'string' || value.trim() === '') return fallback;
    if (!allowed.includes(value as T)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid query value');
    }
    return value as T;
  }

  private parseOptionalEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
    if (typeof value !== 'string' || value.trim() === '') return undefined;
    if (!allowed.includes(value as T)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid query value');
    }
    return value as T;
  }

  private parseOptionalPositiveInt(value: unknown, field: string): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return this.parsePositiveInt(value, 0, 1, Number.MAX_SAFE_INTEGER, field);
  }

  private parsePositiveInt(
    value: unknown,
    fallback: number,
    min: number,
    max: number,
    field: string,
  ): number {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, `Invalid ${field}`);
    }
    return parsed;
  }
}

export const myTasksService = new MyTasksService();
