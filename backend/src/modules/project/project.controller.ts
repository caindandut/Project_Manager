import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
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
      const authReq = this.requireAuth(req);
      const workspaceId = this.getWorkspaceId(req);
      const result = await projectService.create({
        ...req.body,
        workspaceId,
        ownerId: authReq.user.id,
      });

      res.status(201).json(success(result));
    });
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const workspaceId = this.getWorkspaceId(req);
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const sort = this.getSort(req);

      const result = await projectService.getAllInWorkspace(workspaceId, { page, limit, sort });
      res.json(success(result.data, result.meta));
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const workspaceId = this.getWorkspaceId(req);
      const projectId = this.getProjectId(req);
      const result = await projectService.getByIdInWorkspace(projectId, workspaceId);
      res.json(success(result));
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const workspaceId = this.getWorkspaceId(req);
      const projectId = this.getProjectId(req);
      const result = await projectService.updateInWorkspace(projectId, workspaceId, req.body);
      res.json(success(result));
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const workspaceId = this.getWorkspaceId(req);
      const projectId = this.getProjectId(req);
      const result = await projectService.deleteInWorkspace(projectId, workspaceId);
      res.json(success(result));
    });
  };

  private requireAuth(req: Request): AuthenticatedRequest & { user: NonNullable<AuthenticatedRequest['user']> } {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      throw ApiError.unauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
    }

    return authReq as AuthenticatedRequest & { user: NonNullable<AuthenticatedRequest['user']> };
  }

  private getWorkspaceId(req: Request): number {
    const workspaceId = parseInt(req.params.workspaceId || '0', 10);
    if (!workspaceId || isNaN(workspaceId)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid workspace ID');
    }

    return workspaceId;
  }

  private getProjectId(req: Request): number {
    const projectId = parseInt(req.params.projectId || req.params.id || '0', 10);
    if (!projectId || isNaN(projectId)) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid project ID');
    }

    return projectId;
  }

  private getSort(req: Request): Prisma.ProjectOrderByWithRelationInput[] | undefined {
    const sort = req.query.sort;
    if (typeof sort !== 'string') return undefined;

    const [field, direction] = sort.split(':');
    if (
      (field === 'createdAt' || field === 'updatedAt' || field === 'name' || field === 'key') &&
      (direction === 'asc' || direction === 'desc')
    ) {
      return [{ [field]: direction }];
    }

    throw ApiError.badRequest(
      ErrorCode.VALIDATION_ERROR,
      'Sort format must be field:asc or field:desc',
    );
  }
}

export const projectController = new ProjectController();
