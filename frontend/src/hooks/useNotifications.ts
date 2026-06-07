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
import { useRealtimeStore } from '@/lib/realtime'

export const NOTIFICATION_REFRESH_INTERVAL_MS = 1_000

// ── Query Keys ────────────────────────────────────────────────────

const notificationKeys = {
  all: ['notifications'] as const,
  grouped: (category?: string, limit?: number) => [...notificationKeys.all, 'grouped', category, limit] as const,
  list: (category?: string, page?: number, limit?: number, isRead?: boolean, q?: string) =>
    [...notificationKeys.all, 'list', category, page, limit, isRead, q] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  groupDetail: (groupKey: string) => [...notificationKeys.all, 'group', groupKey] as const,
  preferences: () => ['notification-preferences'] as const,
}

// ── Queries ───────────────────────────────────────────────────────

/**
 * Get grouped notifications for dropdown.
 */
export function useGroupedNotificationsQuery(category?: string, limit = 10) {
  const isRealtimeConnected = useRealtimeStore((state) => state.isConnected)

  return useQuery({
    queryKey: notificationKeys.grouped(category, limit),
    queryFn: () => getGroupedNotifications(category, limit),
    refetchInterval: isRealtimeConnected ? false : NOTIFICATION_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  })
}

/**
 * Get flat notification list for the full history page.
 */
export function useNotificationsQuery(options?: {
  category?: string
  limit?: number
  page?: number
  isRead?: boolean
  q?: string
}) {
  const category = options?.category
  const limit = options?.limit ?? 10
  const page = options?.page ?? 1
  const isRead = options?.isRead
  const q = options?.q

  return useQuery({
    queryKey: notificationKeys.list(category, page, limit, isRead, q),
    queryFn: () => getNotifications({ category, limit, page, isRead, q }),
  })
}

/**
 * Get DIRECT unread count for the badge.
 */
export function useUnreadCountQuery() {
  const isRealtimeConnected = useRealtimeStore((state) => state.isConnected)

  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    refetchInterval: isRealtimeConnected ? false : NOTIFICATION_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
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
