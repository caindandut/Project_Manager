import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getGroupedNotifications,
  getNotifications,
  getUnreadCount,
  getGroupDetail,
  markAsRead,
  markAllAsRead,
  markGroupAsRead,
  getNotificationPreferences,
  updateNotificationPreference,
} from '@/lib/notification-api'

// ── Query Keys ────────────────────────────────────────────────────

const notificationKeys = {
  all: ['notifications'] as const,
  grouped: (category?: string) => [...notificationKeys.all, 'grouped', category] as const,
  list: (category?: string) => [...notificationKeys.all, 'list', category] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  groupDetail: (groupKey: string) => [...notificationKeys.all, 'group', groupKey] as const,
  preferences: () => ['notification-preferences'] as const,
}

// ── Queries ───────────────────────────────────────────────────────

/**
 * Get grouped notifications for dropdown (polls every 30s).
 */
export function useGroupedNotificationsQuery(category?: string, limit = 10) {
  return useQuery({
    queryKey: notificationKeys.grouped(category),
    queryFn: () => getGroupedNotifications(category, limit),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

/**
 * Get flat notification list for the full history page.
 */
export function useNotificationsQuery(category?: string, limit = 20) {
  return useQuery({
    queryKey: notificationKeys.list(category),
    queryFn: () => getNotifications({ category, limit }),
  })
}

/**
 * Get DIRECT unread count for the badge (polls every 30s).
 */
export function useUnreadCountQuery() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

/**
 * Get all notifications within a group (on-demand).
 */
export function useGroupDetailQuery(groupKey: string | null) {
  return useQuery({
    queryKey: notificationKeys.groupDetail(groupKey ?? ''),
    queryFn: () => getGroupDetail(groupKey!),
    enabled: !!groupKey,
  })
}

/**
 * Get notification preferences.
 */
export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: getNotificationPreferences,
  })
}

// ── Mutations ─────────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 */
export function useMarkAsReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

/**
 * Mark all notifications as read (optionally per category).
 */
export function useMarkAllAsReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (category?: string) => markAllAsRead(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

/**
 * Mark all notifications in a group as read.
 */
export function useMarkGroupAsReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (groupKey: string) => markGroupAsRead(groupKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

/**
 * Update a notification preference (email toggle).
 */
export function useUpdatePreferenceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventType, email }: { eventType: string; email: boolean }) =>
      updateNotificationPreference(eventType, { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() })
    },
  })
}
