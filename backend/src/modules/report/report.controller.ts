import { Request, Response } from 'express';
import { reportService } from './report.service';
import { BaseController } from '../../common/base/BaseController';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';

export class ReportController extends BaseController {
  constructor() {
    super('ReportController');
  }

  getWorkspaceStats = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const workspaceId = parseInt(req.params.workspaceId, 10);
      if (!workspaceId) {
        throw ApiError.badRequest(
          ErrorCode.VALIDATION_ERROR,
          'Workspace ID is required'
        );
      }

      const result = await reportService.getWorkspaceStats({ workspaceId });
      res.json(success(result));
    });
  };

  getProjectProgress = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const projectId = parseInt(req.params.projectId, 10);
      if (!projectId) {
        throw ApiError.badRequest(
          ErrorCode.VALIDATION_ERROR,
          'Project ID is required'
        );
      }

      const result = await reportService.getProjectProgress({ projectId });
      res.json(success(result));
    });
  };

  getBurndownData = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const projectId = parseInt(req.params.projectId, 10);
      const { startDate, endDate } = req.query;

      if (!projectId) {
        throw ApiError.badRequest(
          ErrorCode.VALIDATION_ERROR,
          'Project ID is required'
        );
      }

      if (!startDate || !endDate) {
        throw ApiError.badRequest(
          ErrorCode.VALIDATION_ERROR,
          'Start date and end date are required'
        );
      }

      const result = await reportService.getBurndownData({
        projectId,
        startDate: startDate as string,
        endDate: endDate as string,
      });
      res.json(success(result));
    });
  };

  getWorkloadReport = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const workspaceId = parseInt(req.params.workspaceId, 10);
      if (!workspaceId) {
        throw ApiError.badRequest(
          ErrorCode.VALIDATION_ERROR,
          'Workspace ID is required'
        );
      }

      const result = await reportService.getWorkloadReport({ workspaceId });
      res.json(success(result));
    });
  };
}

export const reportController = new ReportController();
