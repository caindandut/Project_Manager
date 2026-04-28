import { Request, Response } from 'express';
import { Prisma, TaskPriority, TaskStatus, TaskType } from '@prisma/client';
import { taskService, TaskFilter } from './task.service';
import { BaseController, AuthenticatedRequest } from '../../common/base/BaseController';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';

const TASK_STATUSES = new Set<string>(Object.values(TaskStatus));
const TASK_PRIORITIES = new Set<string>(Object.values(TaskPriority));
const TASK_TYPES = new Set<string>(Object.values(TaskType));
const SORT_FIELDS = new Set(['order', 'createdAt', 'updatedAt', 'priority', 'status', 'dueDate']);

export class TaskController extends BaseController {
  constructor() {
    super('TaskController');
  }

  create = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const projectId = this.getProjectId(req);
      const result = await taskService.create({
        ...req.body,
        projectId,
      });
      res.status(201).json(success(result));
    });
  };

  createSubTask = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const parentId = this.getTaskId(req);
      const result = await taskService.createSubTask(parentId, req.body);
      res.status(201).json(success(result));
    });
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const projectId = this.getProjectId(req);
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      const sort = this.parseSort(req);
      const filter = this.parseFilter(req);

      const result = await taskService.getAllInProject(projectId, {
        limit,
        cursor,
        sort,
        filter,
      });

      res.json(success(result.data, result.meta));
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const taskId = this.getTaskId(req);
      const result = await taskService.getTaskDetail(taskId, {
        includeSubTasks: this.parseBoolean(req.query.includeSubTasks, true),
        includeComments: this.parseBoolean(req.query.includeComments, true),
        includeAttachments: this.parseBoolean(req.query.includeAttachments, true),
        includeActivities: this.parseBoolean(req.query.includeActivities, true),
        commentLimit: parseInt(req.query.commentLimit as string, 10) || 5,
      });
      res.json(success(result));
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const taskId = this.getTaskId(req);
      const userId = this.getUserId(req);
      const result = await taskService.update(taskId, req.body, userId);
      res.json(success(result));
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const taskId = this.getTaskId(req);
      const result = await taskService.delete(taskId);
      res.json(success(result));
    });
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const taskId = this.getTaskId(req);
      const userId = this.getUserId(req);
      const result = await taskService.updateStatus(taskId, req.body.status, userId);
      res.json(success(result));
    });
  };

  assign = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const taskId = this.getTaskId(req);
      const userId = this.getUserId(req);
      const result = await taskService.assign(taskId, req.body.assigneeId ?? null, userId);
      res.json(success(result));
    });
  };

  logTime = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const taskId = this.getTaskId(req);
      const result = await taskService.logTime(taskId, req.body.hours);
      res.json(success(result));
    });
  };

  private getProjectId(req: Request): number {
    const projectId = parseInt(req.params.projectId || '0', 10);
    if (!projectId || isNaN(projectId)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid project ID');
    }

    return projectId;
  }

  private getTaskId(req: Request): number {
    const taskId = parseInt(req.params.taskId || req.params.id || '0', 10);
    if (!taskId || isNaN(taskId)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid task ID');
    }

    return taskId;
  }

  private parseFilter(req: Request): TaskFilter {
    const filter: TaskFilter = {};
    const status = this.getQueryValue(req, 'status') || this.getFilterValue(req, 'status', 'eq');
    const priority = this.getQueryValue(req, 'priority') || this.getFilterValue(req, 'priority', 'eq');
    const type = this.getQueryValue(req, 'type') || this.getFilterValue(req, 'type', 'eq');
    const assigneeId = this.getQueryValue(req, 'assigneeId') || this.getFilterValue(req, 'assigneeId', 'eq');
    const assigneeIdIn = this.getFilterValue(req, 'assigneeId', 'in');
    const titleContains = this.getFilterValue(req, 'title', 'contains');
    const hasSubtasks = this.getQueryValue(req, 'hasSubtasks');

    if (status) {
      if (!TASK_STATUSES.has(status)) throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid status filter');
      filter.status = status as TaskStatus;
    }

    if (priority) {
      if (!TASK_PRIORITIES.has(priority)) throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid priority filter');
      filter.priority = priority as TaskPriority;
    }

    if (type) {
      if (!TASK_TYPES.has(type)) throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid type filter');
      filter.type = type as TaskType;
    }

    if (assigneeId) {
      const parsed = parseInt(assigneeId, 10);
      if (!parsed || isNaN(parsed)) throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid assignee filter');
      filter.assigneeId = parsed;
    }

    if (assigneeIdIn) {
      const ids = assigneeIdIn.split(',').map((id) => parseInt(id, 10));
      if (ids.some((id) => !id || isNaN(id))) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid assignee filter');
      }
      filter.assigneeIdIn = ids;
    }

    if (titleContains) filter.titleContains = titleContains;

    if (hasSubtasks !== undefined) {
      filter.hasSubtasks = this.parseBoolean(hasSubtasks, false);
    }

    return filter;
  }

  private parseSort(req: Request): Prisma.TaskOrderByWithRelationInput[] | undefined {
    const sort = req.query.sort;
    if (typeof sort !== 'string' || sort.trim() === '') return undefined;

    return sort.split(',').map((entry) => {
      const [field, direction = 'desc'] = entry.split(':');
      if (!SORT_FIELDS.has(field) || (direction !== 'asc' && direction !== 'desc')) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid sort parameter');
      }

      return { [field]: direction };
    });
  }

  private getQueryValue(req: Request, key: string): string | undefined {
    const value = req.query[key];
    return typeof value === 'string' ? value : undefined;
  }

  private getFilterValue(req: Request, field: string, operator: string): string | undefined {
    const directKey = `filter[${field}][${operator}]`;
    const direct = req.query[directKey];
    if (typeof direct === 'string') return direct;

    const filter = req.query.filter;
    if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return undefined;

    const fieldFilter = (filter as Record<string, unknown>)[field];
    if (!fieldFilter || typeof fieldFilter !== 'object' || Array.isArray(fieldFilter)) return undefined;

    const value = (fieldFilter as Record<string, unknown>)[operator];
    return typeof value === 'string' ? value : undefined;
  }

  private parseBoolean(value: unknown, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid boolean value');
  }
}

export const taskController = new TaskController();
