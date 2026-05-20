// ============================================================
// Admin Module — Frontend Types
// ============================================================

export interface DashboardStats {
  totalUsers: number
  totalWorkspaces: number
  totalProjects: number
  totalTasks: number
  blockedUsers: number
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
