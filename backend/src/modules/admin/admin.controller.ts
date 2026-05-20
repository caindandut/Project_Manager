import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { BaseController } from '../../common/base/BaseController';
import { AuthenticatedRequest } from '../../types/interfaces';
import { success } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';

export class AdminController extends BaseController {
  constructor() {
    super('AdminController');
  }

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------

  getStats = async (_req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const stats = await adminService.getDashboardStats();
      res.json(success(stats));
    });
  };

  getTrends = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const months = parseInt(req.query.months as string, 10) || 12;
      const trends = await adminService.getRegistrationTrend(months);
      res.json(success(trends));
    });
  };

  getRecentActivity = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const activities = await adminService.getRecentSystemActivity(limit);
      res.json(success(activities));
    });
  };

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  getUsers = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = req.query.search as string | undefined;
      const status = req.query.status as 'active' | 'blocked' | undefined;
      const role = req.query.role as 'OWNER' | 'USER' | undefined;

      const result = await adminService.getUsers({ page, limit, search, status, role });
      res.json(success(result.data, result.meta));
    });
  };

  getUserDetail = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const userId = parseInt(req.params.userId, 10);
      if (!userId || isNaN(userId)) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid user ID');
      }

      const user = await adminService.getUserDetail(userId);
      res.json(success(user));
    });
  };

  updateUserStatus = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      const userId = parseInt(req.params.userId, 10);
      if (!userId || isNaN(userId)) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid user ID');
      }

      const { isBlocked } = req.body;
      if (typeof isBlocked !== 'boolean') {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'isBlocked must be a boolean');
      }

      await adminService.updateUserStatus(userId, isBlocked, authReq.user!.id);
      res.json(success({ message: isBlocked ? 'User blocked' : 'User unblocked' }));
    });
  };

  updateUserRole = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      const userId = parseInt(req.params.userId, 10);
      if (!userId || isNaN(userId)) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid user ID');
      }

      const { role } = req.body;
      if (!role || !['OWNER', 'USER'].includes(role)) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Role must be OWNER or USER');
      }

      await adminService.updateUserSystemRole(userId, role, authReq.user!.id);
      res.json(success({ message: `User role updated to ${role}` }));
    });
  };

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------

  getSettings = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const category = req.query.category as string | undefined;
      const settings = await adminService.getSettings(category);
      res.json(success(settings));
    });
  };

  updateSettings = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const authReq = req as AuthenticatedRequest;
      const { settings } = req.body;

      if (!Array.isArray(settings)) {
        throw ApiError.badRequest(ErrorCode.VALIDATION_ERROR, 'Settings must be an array');
      }

      const results = await adminService.updateSettings(settings, authReq.user!.id);
      res.json(success(results));
    });
  };

  // -------------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------------

  getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    await this.tryCatch(res, async () => {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const action = req.query.action as string | undefined;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      const result = await adminService.getAuditLogs({
        page,
        limit,
        action,
        startDate,
        endDate,
      });
      res.json(success(result.data, result.meta));
    });
  };
}

export const adminController = new AdminController();
