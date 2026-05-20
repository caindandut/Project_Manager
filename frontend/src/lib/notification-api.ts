import apiClient, { normalizeApiError, unwrapResponse } from '@/lib/api-client'
import type { ApiResponse, CursorMeta } from '@/types/api'
import type { GroupedNotification, NotificationItem, NotificationPreference } from '@/types/notification'

// ── Notifications ─────────────────────────────────────────────────

interface GroupedNotificationsResponse {
  success: boolean
  data: GroupedNotification[]
  meta?: { total: number; unreadCount: number }
}

interface NotificationsListResponse {
  success: boolean
  data: NotificationItem[]
  meta?: CursorMeta
}

export async function getGroupedNotifications(
  category?: string,
  limit = 10,
): Promise<{ data: GroupedNotification[]; meta: { total: number; unreadCount: number } }> {
  try {
    const response = await apiClient.get<GroupedNotificationsResponse>('/notifications', {
      params: { grouped: true, category, limit },
    })
    return {
      data: response.data.data ?? [],
      meta: response.data.meta ?? { total: 0, unreadCount: 0 },
    }
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function getNotifications(
  options?: { category?: string; limit?: number; cursor?: string; isRead?: boolean },
): Promise<{ data: NotificationItem[]; meta: CursorMeta }> {
  try {
    const response = await apiClient.get<NotificationsListResponse>('/notifications', {
      params: {
        category: options?.category,
        limit: options?.limit ?? 20,
        cursor: options?.cursor,
        isRead: options?.isRead,
      },
    })
    return {
      data: response.data.data ?? [],
      meta: response.data.meta ?? { limit: 20, hasMore: false },
    }
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const response = await apiClient.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count')
    return unwrapResponse(response).unreadCount
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function getGroupDetail(groupKey: string): Promise<NotificationItem[]> {
  try {
    const response = await apiClient.get<ApiResponse<NotificationItem[]>>(
      `/notifications/groups/${encodeURIComponent(groupKey)}`,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function markAsRead(id: number): Promise<NotificationItem> {
  try {
    const response = await apiClient.patch<ApiResponse<NotificationItem>>(`/notifications/${id}`)
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function markAllAsRead(category?: string): Promise<{ updatedCount: number }> {
  try {
    const response = await apiClient.patch<ApiResponse<{ updatedCount: number }>>('/notifications', null, {
      params: { category },
    })
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function markGroupAsRead(groupKey: string): Promise<{ updatedCount: number }> {
  try {
    const response = await apiClient.patch<ApiResponse<{ updatedCount: number }>>(
      `/notifications/groups/${encodeURIComponent(groupKey)}/read`,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function deleteNotification(id: number): Promise<void> {
  try {
    await apiClient.delete(`/notifications/${id}`)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function clearAllNotifications(category?: string): Promise<void> {
  try {
    await apiClient.delete('/notifications', { params: { category } })
  } catch (error) {
    throw normalizeApiError(error)
  }
}

// ── Notification Preferences ──────────────────────────────────────

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  try {
    const response = await apiClient.get<ApiResponse<NotificationPreference[]>>('/notification-preferences')
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function updateNotificationPreference(
  eventType: string,
  data: { email: boolean },
): Promise<NotificationPreference> {
  try {
    const response = await apiClient.patch<ApiResponse<NotificationPreference>>(
      `/notification-preferences/${eventType}`,
      data,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}
