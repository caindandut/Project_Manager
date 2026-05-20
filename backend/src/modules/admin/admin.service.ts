import { adminRepository } from './admin.repository';
import { ApiError } from '../../common/utils/apiError';
import { ErrorCode } from '../../types/enums';
import { logger } from '../../common/utils/logger';
import {
  IAdminService,
  DashboardStats,
  TrendItem,
  RecentActivity,
  AdminUserListOptions,
  AdminUserItem,
  AdminUserDetail,
  AdminSettingItem,
  UpsertSettingInput,
  AuditLogListOptions,
  AuditLogItem,
} from './admin.interface';

export class AdminService implements IAdminService {
  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------

  async getDashboardStats(): Promise<DashboardStats> {
    return adminRepository.getDashboardStats();
  }

  async getRegistrationTrend(months: number): Promise<TrendItem[]> {
    return adminRepository.getRegistrationTrend(months);
  }

  async getRecentSystemActivity(limit: number): Promise<RecentActivity[]> {
    return adminRepository.getRecentSystemActivity(limit);
  }

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  async getUsers(options: AdminUserListOptions) {
    const { data, total } = await adminRepository.getUsers(options);
    return {
      data,
      total,
      meta: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  async getUserDetail(userId: number): Promise<AdminUserDetail> {
    const user = await adminRepository.getUserDetail(userId);
    if (!user) {
      throw ApiError.notFound(ErrorCode.ADMIN_USER_NOT_FOUND, 'User not found');
    }
    return user;
  }

  async updateUserStatus(
    userId: number,
    isBlocked: boolean,
    performedById: number,
  ): Promise<void> {
    // Cannot block yourself
    if (userId === performedById) {
      throw ApiError.badRequest(
        ErrorCode.ADMIN_CANNOT_BLOCK_SELF,
        'You cannot block/unblock yourself',
      );
    }

    const user = await adminRepository.getUserDetail(userId);
    if (!user) {
      throw ApiError.notFound(ErrorCode.ADMIN_USER_NOT_FOUND, 'User not found');
    }

    await adminRepository.updateUserStatus(userId, isBlocked);

    // Audit log
    await adminRepository.createAuditLog({
      action: isBlocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
      targetType: 'USER',
      targetId: userId,
      description: `${isBlocked ? 'Blocked' : 'Unblocked'} user ${user.email}`,
      performedById,
    });

    logger.info(
      `Admin ${performedById} ${isBlocked ? 'blocked' : 'unblocked'} user ${userId}`,
    );
  }

  async updateUserSystemRole(
    userId: number,
    role: string,
    performedById: number,
  ): Promise<void> {
    // Cannot change own role
    if (userId === performedById) {
      throw ApiError.badRequest(
        ErrorCode.ADMIN_CANNOT_CHANGE_OWN_ROLE,
        'You cannot change your own system role',
      );
    }

    const user = await adminRepository.getUserDetail(userId);
    if (!user) {
      throw ApiError.notFound(ErrorCode.ADMIN_USER_NOT_FOUND, 'User not found');
    }

    const oldRole = user.systemRole;
    await adminRepository.updateUserSystemRole(userId, role);

    // Audit log
    await adminRepository.createAuditLog({
      action: 'USER_ROLE_CHANGED',
      targetType: 'USER',
      targetId: userId,
      description: `Changed role of ${user.email} from ${oldRole} to ${role}`,
      metadata: { oldRole, newRole: role },
      performedById,
    });

    logger.info(
      `Admin ${performedById} changed role of user ${userId} from ${oldRole} to ${role}`,
    );
  }

  // -------------------------------------------------------------------------
  // Settings (DB with .env fallback)
  // -------------------------------------------------------------------------

  async getSettings(category?: string): Promise<AdminSettingItem[]> {
    return adminRepository.getSettings(category);
  }

  async updateSettings(
    settings: UpsertSettingInput[],
    performedById: number,
  ): Promise<AdminSettingItem[]> {
    const results: AdminSettingItem[] = [];

    for (const setting of settings) {
      const result = await adminRepository.upsertSetting(setting);
      results.push(result);
    }

    // Audit log
    const keys = settings.map((s) => s.key).join(', ');
    await adminRepository.createAuditLog({
      action: 'SETTINGS_UPDATED',
      targetType: 'SYSTEM_SETTING',
      description: `Updated settings: ${keys}`,
      metadata: { updatedKeys: settings.map((s) => s.key) },
      performedById,
    });

    logger.info(`Admin ${performedById} updated settings: ${keys}`);

    return results;
  }

  // -------------------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------------------

  async getAuditLogs(options: AuditLogListOptions) {
    const { data, total } = await adminRepository.getAuditLogs(options);
    return {
      data,
      total,
      meta: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }
}

export const adminService = new AdminService();
