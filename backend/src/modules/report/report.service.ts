import { reportRepository } from './report.repository';
import { BaseService } from '../../common/base/BaseService';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { PaginationMeta } from '../../types/interfaces';

export interface WorkspaceStatsOptions {
  workspaceId: number;
}

export interface ProjectProgressOptions {
  projectId: number;
}

export interface BurndownOptions {
  projectId: number;
  startDate: string;
  endDate: string;
}

export interface WorkloadOptions {
  workspaceId: number;
}

export class ReportService extends BaseService<unknown, unknown, unknown> {
  async getWorkspaceStats(options: WorkspaceStatsOptions) {
    const stats = await reportRepository.getWorkspaceStats(options.workspaceId);
    return stats;
  }

  async getProjectProgress(options: ProjectProgressOptions) {
    const progress = await reportRepository.getProjectProgress(options.projectId);
    return progress;
  }

  async getBurndownData(options: BurndownOptions) {
    const startDate = new Date(options.startDate);
    const endDate = new Date(options.endDate);

    if (startDate > endDate) {
      throw ApiError.badRequest(
        ErrorCode.VALIDATION_ERROR,
        'Start date must be before end date'
      );
    }

    const data = await reportRepository.getBurndownData(
      options.projectId,
      startDate,
      endDate
    );
    return data;
  }

  async getWorkloadReport(options: WorkloadOptions) {
    const workload = await reportRepository.getWorkloadReport(options.workspaceId);
    return workload;
  }

  getById(_id: number): Promise<unknown> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  getAll(_options?: any): Promise<{ data: unknown[]; meta?: PaginationMeta }> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  create(_data: unknown): Promise<unknown> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  update(_id: number, _data: unknown): Promise<unknown> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }

  delete(_id: number): Promise<unknown> {
    throw ApiError.notFound(ErrorCode.NOT_IMPLEMENTED, 'Not implemented');
  }
}

export const reportService = new ReportService();
