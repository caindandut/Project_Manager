// ── Notification types ────────────────────────────────────────────

export interface NotificationActor {
  id: number
  name: string
  avatar: string | null
}

export interface NotificationTask {
  id: number
  title: string
  projectId: number
}

export interface NotificationItem {
  id: number
  type: string
  category: 'DIRECT' | 'WATCHING'
  title: string
  message: string
  isRead: boolean
  taskId: number | null
  userId: number
  groupKey: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  task: NotificationTask | null
  actor: NotificationActor | null
}

export interface GroupedNotification {
  groupKey: string
  notification: NotificationItem
  count: number
  hasUnread: boolean
}

// ── Notification Preference types ─────────────────────────────────

export interface NotificationPreference {
  eventType: string
  eventLabel: string
  inApp: boolean
  email: boolean
}
