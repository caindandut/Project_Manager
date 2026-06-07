// ============================================================
// Admin Module — Frontend Types
// ============================================================

export interface DashboardStats {
  totalUsers: number
  totalWorkspaces: number
  totalProjects: number
  totalTasks: number
  blockedUsers: number
  overdueTasks: number
  emailConfigured: boolean
  gmailApiConfigured: boolean
}

export interface TrendItem {
  month: string
  users: number
  workspaces: number
}

export interface RecentActivity {
  id: number
  type: 'USER_REGISTERED' | 'WORKSPACE_CREATED'
  description: string
  createdAt: string
}

export interface AdminUserItem {
  id: number
  email: string
  name: string
  avatar: string | null
  systemRole: 'OWNER' | 'USER'
  isBlocked: boolean
  createdAt: string
  _count?: {
    memberships: number
  }
}

export interface AdminUserDetail {
  id: number
  email: string
  name: string
  avatar: string | null
  bio: string | null
  systemRole: 'OWNER' | 'USER'
  isBlocked: boolean
  createdAt: string
  updatedAt: string
  workspaces: { id: number; name: string; role: string }[]
  projects: { id: number; name: string; key: string; role: string; workspaceName: string }[]
}

export interface OwnerWorkspaceItem {
  id: number
  name: string
  slug: string
  createdAt: string
  updatedAt: string
  memberCount: number
  adminCount: number
  projectCount: number
  taskCount: number
}

export interface OwnerProjectItem {
  id: number
  name: string
  key: string
  color: string | null
  createdAt: string
  updatedAt: string
  workspace: {
    id: number
    name: string
    slug: string
  }
  owner: {
    id: number
    name: string
    email: string
  }
  memberCount: number
  taskCount: number
  overdueTaskCount: number
}

export interface OwnerOversightParams {
  page: number
  limit: number
  search?: string
}

export interface OwnerSystemHealth {
  generatedAt: string
  database: {
    status: 'ok' | 'error'
    message: string
  }
  email: {
    smtpConfigured: boolean
    gmailApiConfigured: boolean
    fromConfigured: boolean
    source: 'database' | 'environment' | 'missing'
  }
  oauth: {
    googleConfigured: boolean
    source: 'database' | 'environment' | 'missing'
  }
  sessions: {
    activeRefreshTokens: number
    expiredRefreshTokens: number
  }
  cleanup: {
    expiredOtpCodes: number
  }
  riskSignals: {
    blockedUsers: number
    overdueTasks: number
    pendingInvitations: number
    owners: number
  }
}

export interface MaintenanceResult {
  deleted: number
}

export interface AdminSettingItem {
  id: number
  key: string
  value: string
  category: string
  updatedAt: string
}

export interface UpsertSettingInput {
  key: string
  value: string
  category?: string
}

export interface AuditLogItem {
  id: number
  action: string
  targetType: string
  targetId: number | null
  description: string
  metadata: Record<string, unknown> | null
  performedBy: {
    id: number
    name: string
    email: string
    avatar: string | null
  }
  createdAt: string
}

export interface AdminUsersParams {
  page: number
  limit: number
  search?: string
  status?: 'active' | 'blocked'
  role?: 'OWNER' | 'USER'
}

export interface AuditLogParams {
  page: number
  limit: number
  action?: string
  startDate?: string
  endDate?: string
}
