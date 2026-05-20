import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAdminDashboardStats,
  getAdminDashboardTrends,
  getAdminRecentActivity,
  getAdminUsers,
  getAdminUserDetail,
  updateAdminUserStatus,
  updateAdminUserRole,
  getAdminSettings,
  updateAdminSettings,
  getAdminAuditLogs,
} from '@/lib/admin-api'
import type { AdminUsersParams, AuditLogParams, UpsertSettingInput } from '@/types/admin'

// ============================================================
// Query Keys
// ============================================================

export const adminQueryKeys = {
  stats: ['admin', 'stats'] as const,
  trends: (months: number) => ['admin', 'trends', months] as const,
  recentActivity: (limit: number) => ['admin', 'recent-activity', limit] as const,
  users: (params: AdminUsersParams) => ['admin', 'users', params] as const,
  userDetail: (userId: number) => ['admin', 'user', userId] as const,
  settings: (category?: string) => ['admin', 'settings', category ?? 'all'] as const,
  auditLogs: (params: AuditLogParams) => ['admin', 'audit-logs', params] as const,
}

// ============================================================
// Dashboard Hooks
// ============================================================

export const useAdminStats = () =>
  useQuery({
    queryKey: adminQueryKeys.stats,
    queryFn: getAdminDashboardStats,
  })

export const useAdminTrends = (months = 12) =>
  useQuery({
    queryKey: adminQueryKeys.trends(months),
    queryFn: () => getAdminDashboardTrends(months),
  })

export const useAdminRecentActivity = (limit = 10) =>
  useQuery({
    queryKey: adminQueryKeys.recentActivity(limit),
    queryFn: () => getAdminRecentActivity(limit),
  })

// ============================================================
// Users Hooks
// ============================================================

export const useAdminUsers = (params: AdminUsersParams) =>
  useQuery({
    queryKey: adminQueryKeys.users(params),
    queryFn: () => getAdminUsers(params),
  })

export const useAdminUserDetail = (userId: number) =>
  useQuery({
    queryKey: adminQueryKeys.userDetail(userId),
    queryFn: () => getAdminUserDetail(userId),
    enabled: userId > 0,
  })

export const useUpdateUserStatusMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, isBlocked }: { userId: number; isBlocked: boolean }) =>
      updateAdminUserStatus(userId, isBlocked),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export const useUpdateUserRoleMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'OWNER' | 'USER' }) =>
      updateAdminUserRole(userId, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

// ============================================================
// Settings Hooks
// ============================================================

export const useAdminSettings = (category?: string) =>
  useQuery({
    queryKey: adminQueryKeys.settings(category),
    queryFn: () => getAdminSettings(category),
  })

export const useUpdateSettingsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: UpsertSettingInput[]) => updateAdminSettings(settings),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
    },
  })
}

// ============================================================
// Audit Logs Hooks
// ============================================================

export const useAdminAuditLogs = (params: AuditLogParams) =>
  useQuery({
    queryKey: adminQueryKeys.auditLogs(params),
    queryFn: () => getAdminAuditLogs(params),
  })
