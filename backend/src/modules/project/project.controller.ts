import { Request, Response } from 'express';
import { projectService } from './project.service';
import { BaseController } from '../../common/base/BaseController';
import { AuthenticatedRequest } from '../../types/interfaces';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';

export class ProjectController extends BaseController {
  constructor() {
    super('ProjectController');
  }

  create = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
      }

      const workspaceId = parseInt(req.params.workspaceId, 10);
      const result = await projectService.create({
        ...req.body,
        workspaceId,
        ownerId: authReq.user.id,
      });
      res.status(201).json(success(result));
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const projectId = parseInt(req.params.projectId || req.params.id, 10);
      const result = await projectService.getById(projectId);
      res.json(success(result));
    });
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const workspaceId = parseInt(req.params.workspaceId, 10);
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await projectService.getAllInWorkspace(workspaceId, { page, limit });
      res.json(success(result.data, result.meta));
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const projectId = parseInt(req.params.projectId || req.params.id, 10);
      const result = await projectService.update(projectId, req.body);
      res.json(success(result));
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const projectId = parseInt(req.params.projectId || req.params.id, 10);
      const result = await projectService.delete(projectId);
      res.json(success(result));
    });
  };
}

export const projectController = new ProjectController();
