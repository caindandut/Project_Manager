import { useState, useCallback } from "react"
import { Bell, Check, CheckCheck, Loader2, Search, User2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  useNotificationsQuery,
  useUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from "@/hooks/useNotifications"
import type { NotificationItem } from "@/types/notification"

const typeIcons: Record<string, string> = {
  TASK_ASSIGNED: "📋",
  TASK_STATUS_CHANGED: "🔄",
  TASK_COMMENTED: "💬",
  TASK_UPDATED: "✏️",
  MENTION: "📣",
  MEMBER_JOINED: "👤",
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined)
  const [readFilter, setReadFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const notificationsQuery = useNotificationsQuery(activeTab, 50)
  const unreadCountQuery = useUnreadCountQuery()
  const markAsReadMutation = useMarkAsReadMutation()
  const markAllAsReadMutation = useMarkAllAsReadMutation()

  const allNotifications = notificationsQuery.data?.data ?? []
  const unreadCount = unreadCountQuery.data ?? 0

  // Client-side filtering
  const filteredNotifications = allNotifications.filter((n) => {
    if (readFilter === "unread" && n.isRead) return false
    if (readFilter === "read" && !n.isRead) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        n.message.toLowerCase().includes(q) ||
        n.title.toLowerCase().includes(q) ||
        n.task?.title.toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleNotificationClick = useCallback(
    (notification: NotificationItem) => {
      if (!notification.isRead) {
        markAsReadMutation.mutate(notification.id)
      }
      if (notification.taskId && notification.task) {
        navigate(
          `/workspaces/_/projects/${notification.task.projectId}/list?taskId=${notification.taskId}`,
        )
      }
    },
    [markAsReadMutation, navigate],
  )

  const handleMarkAllRead = useCallback(() => {
    markAllAsReadMutation.mutate(activeTab)
  }, [markAllAsReadMutation, activeTab])

  return (
    <section className="mx-auto max-w-4xl space-y-4 p-6">
      {/* Header */}
      <div className="rounded-md border border-border/80 bg-muted/40 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Tất cả thông báo</h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Không có thông báo chưa đọc"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleMarkAllRead}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Đọc tất cả
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category tabs */}
        <div className="flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
          {[
            { value: undefined, label: "Tất cả" },
            { value: "DIRECT", label: "Dành cho tôi" },
            { value: "WATCHING", label: "Đang theo dõi" },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Read filter */}
        <div className="flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
          {[
            { value: "all", label: "Tất cả" },
            { value: "unread", label: "Chưa đọc" },
            { value: "read", label: "Đã đọc" },
          ].map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                readFilter === filter.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setReadFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm thông báo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-10 text-sm"
          />
        </div>
      </div>

      {/* Notification list */}
      <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm">
        {notificationsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
              <Bell className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground/80">Không tìm thấy thông báo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredNotifications.map((notification) => (
              <NotificationFullRow
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                onMarkRead={() => markAsReadMutation.mutate(notification.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function NotificationFullRow({
  notification,
  onClick,
  onMarkRead,
}: {
  notification: NotificationItem
  onClick: () => void
  onMarkRead: () => void
}) {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: vi,
  })

  return (
    <div
      className={cn(
        "flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/40 cursor-pointer group",
        !notification.isRead && "bg-primary/[0.02]",
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative mt-0.5 flex-shrink-0">
        {notification.actor?.avatar ? (
          <img
            src={notification.actor.avatar}
            alt={notification.actor.name}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-background"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-background">
            <User2 className="h-5 w-5" />
          </div>
        )}
        {!notification.isRead && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-primary ring-2 ring-card" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-sm leading-relaxed",
          !notification.isRead ? "text-foreground font-medium" : "text-muted-foreground",
        )}>
          <span className="mr-1.5">{typeIcons[notification.type] ?? "🔔"}</span>
          {notification.message}
        </p>

        <div className="mt-1.5 flex items-center gap-3">
          <span className="text-xs text-muted-foreground/70">{timeAgo}</span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            notification.category === "DIRECT"
              ? "bg-primary/10 text-primary"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          )}>
            {notification.category === "DIRECT" ? "Dành cho tôi" : "Đang theo dõi"}
          </span>
          {notification.task && (
            <span className="text-xs text-muted-foreground/60 truncate max-w-[200px]">
              {notification.task.title}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Đánh dấu đã đọc"
            onClick={(e) => {
              e.stopPropagation()
              onMarkRead()
            }}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
