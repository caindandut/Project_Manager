// ============================================================
// Admin Module — Interfaces
// ============================================================

export interface DashboardStats {
  totalUsers: number;
  totalWorkspaces: number;
  totalProjects: number;
  totalTasks: number;
  blockedUsers: number;
  overdueTasks: number;
  emailConfigured: boolean;
  gmailApiConfigured: boolean;
}

export interface TrendItem {
  month: string; // e.g. "2026-01"
  users: number;
  workspaces: number;
}

export interface RecentActivity {
  id: number;
  type: 'USER_REGISTERED' | 'WORKSPACE_CREATED';
  description: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface AdminUserListOptions {
  page: number;
  limit: number;
  search?: string;
  status?: 'active' | 'blocked';
  role?: 'OWNER' | 'USER';
}

export interface AdminUserItem {
  id: number;
  email: string;
  name: string;
  avatar: string | null;
  systemRole: string;
  isBlocked: boolean;
  createdAt: Date;
  _count?: {
    memberships: number;
  };
}

export interface AdminUserDetail {
  id: number;
  email: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  systemRole: string;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  workspaces: { id: number; name: string; role: string }[];
  projects: { id: number; name: string; key: string; role: string; workspaceName: string }[];
}

export interface OwnerWorkspaceItem {
  id: number;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  adminCount: number;
  projectCount: number;
  taskCount: number;
}

export interface OwnerProjectItem {
  id: number;
  name: string;
  key: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
  workspace: {
    id: number;
    name: string;
    slug: string;
  };
  owner: {
    id: number;
    name: string;
    email: string;
  };
  memberCount: number;
  taskCount: number;
  overdueTaskCount: number;
}

export interface OwnerOversightListOptions {
  page: number;
  limit: number;
  search?: string;
}

export interface OwnerSystemHealth {
  generatedAt: Date;
  database: {
    status: 'ok' | 'error';
    message: string;
  };
  email: {
    smtpConfigured: boolean;
    gmailApiConfigured: boolean;
    fromConfigured: boolean;
    source: 'database' | 'environment' | 'missing';
  };
  oauth: {
    googleConfigured: boolean;
    source: 'database' | 'environment' | 'missing';
  };
  sessions: {
    activeRefreshTokens: number;
    expiredRefreshTokens: number;
  };
  cleanup: {
    expiredOtpCodes: number;
  };
  riskSignals: {
    blockedUsers: number;
    overdueTasks: number;
    pendingInvitations: number;
    owners: number;
  };
}

export interface MaintenanceResult {
  deleted: number;
}

export interface AdminSettingItem {
  id: number;
  key: string;
  value: string;
  category: string;
  updatedAt: Date;
}

export interface UpsertSettingInput {
  key: string;
  value: string;
  category?: string;
}

export interface AuditLogItem {
  id: number;
  action: string;
  targetType: string;
  targetId: number | null;
  description: string;
  metadata: Record<string, unknown> | null;
  performedBy: {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
  };
  createdAt: Date;
}

export interface AuditLogListOptions {
  page: number;
  limit: number;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateAuditLogInput {
  action: string;
  targetType: string;
  targetId?: number;
  description: string;
  metadata?: Record<string, unknown>;
  performedById: number;
}

export interface IAdminRepository {
  getDashboardStats(): Promise<DashboardStats>;
  getRegistrationTrend(months: number): Promise<TrendItem[]>;
  getRecentSystemActivity(limit: number): Promise<RecentActivity[]>;
  getUsers(options: AdminUserListOptions): Promise<{ data: AdminUserItem[]; total: number }>;
  getUserDetail(userId: number): Promise<AdminUserDetail | null>;
  updateUserStatus(userId: number, isBlocked: boolean): Promise<void>;
  updateUserSystemRole(userId: number, role: string): Promise<void>;
  getWorkspaces(options: OwnerOversightListOptions): Promise<{ data: OwnerWorkspaceItem[]; total: number }>;
  getProjects(options: OwnerOversightListOptions): Promise<{ data: OwnerProjectItem[]; total: number }>;
  getSystemHealth(): Promise<OwnerSystemHealth>;
  cleanupExpiredRefreshTokens(): Promise<MaintenanceResult>;
  cleanupExpiredOtpCodes(): Promise<MaintenanceResult>;
  getSettings(category?: string): Promise<AdminSettingItem[]>;
  upsertSetting(input: UpsertSettingInput): Promise<AdminSettingItem>;
  getAuditLogs(options: AuditLogListOptions): Promise<{ data: AuditLogItem[]; total: number }>;
  createAuditLog(data: CreateAuditLogInput): Promise<void>;
}

export interface IAdminService {
  getDashboardStats(): Promise<DashboardStats>;
  getRegistrationTrend(months: number): Promise<TrendItem[]>;
  getRecentSystemActivity(limit: number): Promise<RecentActivity[]>;
  getUsers(options: AdminUserListOptions): Promise<{ data: AdminUserItem[]; total: number; meta: { page: number; limit: number; total: number; totalPages: number } }>;
  getUserDetail(userId: number): Promise<AdminUserDetail>;
  updateUserStatus(userId: number, isBlocked: boolean, performedById: number): Promise<void>;
  updateUserSystemRole(userId: number, role: string, performedById: number): Promise<void>;
  getWorkspaces(options: OwnerOversightListOptions): Promise<{ data: OwnerWorkspaceItem[]; total: number; meta: { page: number; limit: number; total: number; totalPages: number } }>;
  getProjects(options: OwnerOversightListOptions): Promise<{ data: OwnerProjectItem[]; total: number; meta: { page: number; limit: number; total: number; totalPages: number } }>;
  getSystemHealth(): Promise<OwnerSystemHealth>;
  cleanupExpiredRefreshTokens(performedById: number): Promise<MaintenanceResult>;
  cleanupExpiredOtpCodes(performedById: number): Promise<MaintenanceResult>;
  getSettings(category?: string): Promise<AdminSettingItem[]>;
  updateSettings(settings: UpsertSettingInput[], performedById: number): Promise<AdminSettingItem[]>;
  getAuditLogs(options: AuditLogListOptions): Promise<{ data: AuditLogItem[]; total: number; meta: { page: number; limit: number; total: number; totalPages: number } }>;
}
