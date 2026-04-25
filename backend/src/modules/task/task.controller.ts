import { Request, Response } from 'express';
import { taskService } from './task.service';
import { BaseController } from '../../common/base/BaseController';
import { AuthenticatedRequest } from '../../types/interfaces';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';

export class TaskController extends BaseController {
  constructor() {
    super('TaskController');
  }

  create = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const projectId = parseInt(req.params.projectId, 10);
      const result = await taskService.create({
        ...req.body,
        projectId,
        createdById: authReq.user.id,
      });
      res.status(201).json(success(result));
    });
  };

  createSubTask = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const parentId = parseInt(req.params.taskId, 10);
      const result = await taskService.createSubTask(parentId, req.body, authReq.user.id);
      res.status(201).json(success(result));
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const taskId = parseInt(req.params.taskId || req.params.id, 10);
      const result = await taskService.getById(taskId);
      res.json(success(result));
    });
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const projectId = parseInt(req.params.projectId, 10);
      const page = parseInt(req.query.page as string, 10) || undefined;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const cursor = req.query.cursor as string;
      const sort = req.query.sort as string;

      const filter: any = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.priority) filter.priority = req.query.priority;
      if (req.query.assigneeId) filter.assigneeId = parseInt(req.query.assigneeId as string, 10);
      if (req.query.type) filter.type = req.query.type;

      const result = await taskService.getAllInProject(projectId, {
        page,
        limit,
        cursor,
        sort,
        filter,
      });
      res.json(success(result.data, result.meta));
    });
  };

  getSubTasks = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const parentId = parseInt(req.params.taskId, 10);
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await taskService.getSubTasks(parentId, { page, limit });
      res.json(success(result.data, result.meta));
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const taskId = parseInt(req.params.taskId || req.params.id, 10);
      const result = await taskService.update(taskId, req.body);
      res.json(success(result));
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const taskId = parseInt(req.params.taskId || req.params.id, 10);
      const result = await taskService.delete(taskId);
      res.json(success(result));
    });
  };

  logTime = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const taskId = parseInt(req.params.taskId, 10);
      const { hours } = req.body;
      const result = await taskService.logTime(taskId, hours);
      res.json(success(result));
    });
  };
}

export const taskController = new TaskController();
