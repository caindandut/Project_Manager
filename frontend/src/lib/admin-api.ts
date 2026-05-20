import apiClient, { unwrapResponse } from './api-client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  DashboardStats,
  TrendItem,
  RecentActivity,
  AdminUserItem,
  AdminUserDetail,
  AdminSettingItem,
  UpsertSettingInput,
  AuditLogItem,
  AdminUsersParams,
  AuditLogParams,
} from '@/types/admin'

// ============================================================
// Dashboard
// ============================================================

export const getAdminDashboardStats = async (): Promise<DashboardStats> => {
  const res = await apiClient.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats')
  return unwrapResponse(res)
}

export const getAdminDashboardTrends = async (months = 12): Promise<TrendItem[]> => {
  const res = await apiClient.get<ApiResponse<TrendItem[]>>('/admin/dashboard/trends', {
    params: { months },
  })
  return unwrapResponse(res)
}

export const getAdminRecentActivity = async (limit = 10): Promise<RecentActivity[]> => {
  const res = await apiClient.get<ApiResponse<RecentActivity[]>>(
    '/admin/dashboard/recent-activity',
    { params: { limit } },
  )
  return unwrapResponse(res)
}

// ============================================================
// Users
// ============================================================

export const getAdminUsers = async (
  params: AdminUsersParams,
): Promise<{ data: AdminUserItem[]; meta: { page: number; limit: number; total: number; totalPages: number } }> => {
  const res = await apiClient.get<PaginatedResponse<AdminUserItem>>('/admin/users', { params })
  const raw = res.data
  return {
    data: raw.data ?? [],
    meta: raw.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  }
}

export const getAdminUserDetail = async (userId: number): Promise<AdminUserDetail> => {
  const res = await apiClient.get<ApiResponse<AdminUserDetail>>(`/admin/users/${userId}`)
  return unwrapResponse(res)
}

export const updateAdminUserStatus = async (
  userId: number,
  isBlocked: boolean,
): Promise<{ message: string }> => {
  const res = await apiClient.patch<ApiResponse<{ message: string }>>(
    `/admin/users/${userId}/status`,
    { isBlocked },
  )
  return unwrapResponse(res)
}

export const updateAdminUserRole = async (
  userId: number,
  role: 'OWNER' | 'USER',
): Promise<{ message: string }> => {
  const res = await apiClient.patch<ApiResponse<{ message: string }>>(
    `/admin/users/${userId}/role`,
    { role },
  )
  return unwrapResponse(res)
}

// ============================================================
// Settings
// ============================================================

export const getAdminSettings = async (category?: string): Promise<AdminSettingItem[]> => {
  const res = await apiClient.get<ApiResponse<AdminSettingItem[]>>('/admin/settings', {
    params: category ? { category } : {},
  })
  return unwrapResponse(res)
}

export const updateAdminSettings = async (
  settings: UpsertSettingInput[],
): Promise<AdminSettingItem[]> => {
  const res = await apiClient.put<ApiResponse<AdminSettingItem[]>>('/admin/settings', { settings })
  return unwrapResponse(res)
}

// ============================================================
// Audit Logs
// ============================================================

export const getAdminAuditLogs = async (
  params: AuditLogParams,
): Promise<{ data: AuditLogItem[]; meta: { page: number; limit: number; total: number; totalPages: number } }> => {
  const res = await apiClient.get<PaginatedResponse<AuditLogItem>>('/admin/audit-logs', { params })
  const raw = res.data
  return {
    data: raw.data ?? [],
    meta: raw.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  }
}
