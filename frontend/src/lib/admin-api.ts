import apiClient, { unwrapResponse } from './api-client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  AdminSettingItem,
  AdminUserDetail,
  AdminUserItem,
  AdminUsersParams,
  AuditLogItem,
  AuditLogParams,
  DashboardStats,
  MaintenanceResult,
  OwnerOversightParams,
  OwnerProjectItem,
  OwnerSystemHealth,
  OwnerWorkspaceItem,
  RecentActivity,
  TrendItem,
  UpsertSettingInput,
} from '@/types/admin'

const OWNER_API_BASE = '/owner'
const defaultMeta = { page: 1, limit: 20, total: 0, totalPages: 0 }

export const getAdminDashboardStats = async (): Promise<DashboardStats> => {
  const res = await apiClient.get<ApiResponse<DashboardStats>>(`${OWNER_API_BASE}/dashboard/stats`)
  return unwrapResponse(res)
}

export const getAdminDashboardTrends = async (months = 12): Promise<TrendItem[]> => {
  const res = await apiClient.get<ApiResponse<TrendItem[]>>(`${OWNER_API_BASE}/dashboard/trends`, {
    params: { months },
  })
  return unwrapResponse(res)
}

export const getAdminRecentActivity = async (limit = 10): Promise<RecentActivity[]> => {
  const res = await apiClient.get<ApiResponse<RecentActivity[]>>(
    `${OWNER_API_BASE}/dashboard/recent-activity`,
    { params: { limit } },
  )
  return unwrapResponse(res)
}

export const getAdminUsers = async (
  params: AdminUsersParams,
): Promise<{ data: AdminUserItem[]; meta: typeof defaultMeta }> => {
  const res = await apiClient.get<PaginatedResponse<AdminUserItem>>(`${OWNER_API_BASE}/users`, { params })
  return {
    data: res.data.data ?? [],
    meta: res.data.meta ?? defaultMeta,
  }
}

export const getAdminUserDetail = async (userId: number): Promise<AdminUserDetail> => {
  const res = await apiClient.get<ApiResponse<AdminUserDetail>>(`${OWNER_API_BASE}/users/${userId}`)
  return unwrapResponse(res)
}

export const updateAdminUserStatus = async (
  userId: number,
  isBlocked: boolean,
): Promise<{ message: string }> => {
  const res = await apiClient.patch<ApiResponse<{ message: string }>>(
    `${OWNER_API_BASE}/users/${userId}/status`,
    { isBlocked },
  )
  return unwrapResponse(res)
}

export const updateAdminUserRole = async (
  userId: number,
  role: 'OWNER' | 'USER',
): Promise<{ message: string }> => {
  const res = await apiClient.patch<ApiResponse<{ message: string }>>(
    `${OWNER_API_BASE}/users/${userId}/role`,
    { role },
  )
  return unwrapResponse(res)
}

export const getOwnerWorkspaces = async (
  params: OwnerOversightParams,
): Promise<{ data: OwnerWorkspaceItem[]; meta: typeof defaultMeta }> => {
  const res = await apiClient.get<PaginatedResponse<OwnerWorkspaceItem>>(`${OWNER_API_BASE}/workspaces`, { params })
  return {
    data: res.data.data ?? [],
    meta: res.data.meta ?? defaultMeta,
  }
}

export const getOwnerProjects = async (
  params: OwnerOversightParams,
): Promise<{ data: OwnerProjectItem[]; meta: typeof defaultMeta }> => {
  const res = await apiClient.get<PaginatedResponse<OwnerProjectItem>>(`${OWNER_API_BASE}/projects`, { params })
  return {
    data: res.data.data ?? [],
    meta: res.data.meta ?? defaultMeta,
  }
}

export const getOwnerSystemHealth = async (): Promise<OwnerSystemHealth> => {
  const res = await apiClient.get<ApiResponse<OwnerSystemHealth>>(`${OWNER_API_BASE}/system/health`)
  return unwrapResponse(res)
}

export const cleanupExpiredRefreshTokens = async (): Promise<MaintenanceResult> => {
  const res = await apiClient.post<ApiResponse<MaintenanceResult>>(
    `${OWNER_API_BASE}/system/maintenance/expired-refresh-tokens`,
  )
  return unwrapResponse(res)
}

export const cleanupExpiredOtpCodes = async (): Promise<MaintenanceResult> => {
  const res = await apiClient.post<ApiResponse<MaintenanceResult>>(
    `${OWNER_API_BASE}/system/maintenance/expired-otp-codes`,
  )
  return unwrapResponse(res)
}

export const getAdminSettings = async (category?: string): Promise<AdminSettingItem[]> => {
  const res = await apiClient.get<ApiResponse<AdminSettingItem[]>>(`${OWNER_API_BASE}/settings`, {
    params: category ? { category } : {},
  })
  return unwrapResponse(res)
}

export const updateAdminSettings = async (
  settings: UpsertSettingInput[],
): Promise<AdminSettingItem[]> => {
  const res = await apiClient.put<ApiResponse<AdminSettingItem[]>>(`${OWNER_API_BASE}/settings`, { settings })
  return unwrapResponse(res)
}

export const getAdminAuditLogs = async (
  params: AuditLogParams,
): Promise<{ data: AuditLogItem[]; meta: typeof defaultMeta }> => {
  const res = await apiClient.get<PaginatedResponse<AuditLogItem>>(`${OWNER_API_BASE}/audit-logs`, { params })
  return {
    data: res.data.data ?? [],
    meta: res.data.meta ?? defaultMeta,
  }
}
