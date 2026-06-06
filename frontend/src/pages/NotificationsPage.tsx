import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Bell, Check, CheckCheck, Loader2, Search, User2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useMarkAllAsReadMutation,
  useMarkAsReadMutation,
  useNotificationsQuery,
  useUnreadCountQuery,
} from "@/hooks/useNotifications"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import { acceptProjectInvitation, declineProjectInvitation } from "@/lib/project-member-api"
import { cn } from "@/lib/utils"
import type { NotificationItem } from "@/types/notification"

const typeIcons: Record<string, string> = {
  TASK_ASSIGNED: "📋",
  TASK_STATUS_CHANGED: "🔄",
  TASK_COMMENTED: "💬",
  TASK_UPDATED: "✏️",
  MENTION: "📣",
  MEMBER_JOINED: "👤",
  INVITATION_RECEIVED: "🤝",
}

const getProjectInvitationMeta = (metadata: NotificationItem["metadata"]) => {
  if (
    metadata?.type === "project" &&
    typeof metadata.projectId === "number" &&
    typeof metadata.memberId === "number"
  ) {
    return {
      projectId: metadata.projectId,
      memberId: metadata.memberId,
    }
  }

  return null
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined)
  const [readFilter, setReadFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const notificationsQuery = useNotificationsQuery(activeTab, 50)
  const unreadCountQuery = useUnreadCountQuery()
  const markAsReadMutation = useMarkAsReadMutation()
  const markAllAsReadMutation = useMarkAllAsReadMutation()

  const unreadCount = unreadCountQuery.data ?? 0
  const allNotifications = notificationsQuery.data?.data ?? []
  const filteredNotifications = allNotifications.filter((notification) => {
    if (readFilter === "unread" && notification.isRead) return false
    if (readFilter === "read" && !notification.isRead) return false

    const query = searchQuery.trim().toLowerCase()
    if (!query) return true

    return (
      notification.message.toLowerCase().includes(query) ||
      notification.title.toLowerCase().includes(query) ||
      notification.task?.title.toLowerCase().includes(query)
    )
  })

  const handleNotificationClick = useCallback(
    (notification: NotificationItem) => {
      if (!notification.isRead) {
        markAsReadMutation.mutate(notification.id)
      }

      if (notification.taskId && notification.task) {
        navigate(`/workspaces/_/projects/${notification.task.projectId}/list?task=${notification.taskId}`)
        return
      }

      if (notification.type === "INVITATION_RECEIVED") {
        const projectInvitationMeta = getProjectInvitationMeta(notification.metadata)
        if (projectInvitationMeta) {
          navigate(`/my-invitations?tab=projects&projectInvitation=${projectInvitationMeta.memberId}`)
        } else {
          navigate("/my-invitations")
        }
      }
    },
    [markAsReadMutation, navigate],
  )

  const handleProjectInvitationAnswer = useCallback(
    async (notification: NotificationItem, action: "accept" | "decline") => {
      const projectInvitationMeta = getProjectInvitationMeta(notification.metadata)
      if (!projectInvitationMeta) return

      try {
        if (action === "accept") {
          await acceptProjectInvitation(projectInvitationMeta.projectId, projectInvitationMeta.memberId)
        } else {
          await declineProjectInvitation(projectInvitationMeta.projectId, projectInvitationMeta.memberId)
        }

        toast.success(action === "accept" ? "Đã chấp nhận lời mời dự án." : "Đã từ chối lời mời dự án.")
        markAsReadMutation.mutate(notification.id)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["my-project-invitations"] }),
          queryClient.invalidateQueries({ queryKey: ["projects"] }),
          queryClient.invalidateQueries({ queryKey: ["workspace-projects"] }),
          queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        ])
      } catch (error) {
        toast.error(toVietnameseErrorMessage(error, "Không thể cập nhật lời mời dự án."))
      }
    },
    [markAsReadMutation, queryClient],
  )

  const handleMarkAllRead = useCallback(() => {
    markAllAsReadMutation.mutate(activeTab)
  }, [activeTab, markAllAsReadMutation])

  return (
    <section className="mx-auto max-w-4xl space-y-4 p-6">
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

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          value={activeTab ?? "all"}
          options={[
            { value: "all", label: "Tất cả" },
            { value: "DIRECT", label: "Dành cho tôi" },
            { value: "WATCHING", label: "Đang theo dõi" },
          ]}
          onChange={(value) => setActiveTab(value === "all" ? undefined : value)}
        />

        <SegmentedControl
          value={readFilter}
          options={[
            { value: "all", label: "Tất cả" },
            { value: "unread", label: "Chưa đọc" },
            { value: "read", label: "Đã đọc" },
          ]}
          onChange={setReadFilter}
        />

        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm thông báo..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 pl-10 text-sm"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
        {notificationsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
              <Bell className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground/80">Không tìm thấy thông báo</p>
            <p className="mt-1 text-xs text-muted-foreground">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredNotifications.map((notification) => (
              <NotificationFullRow
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                onMarkRead={() => markAsReadMutation.mutate(notification.id)}
                onProjectInvitationAnswer={(action) => handleProjectInvitationAnswer(notification, action)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <div className="flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function NotificationFullRow({
  notification,
  onClick,
  onMarkRead,
  onProjectInvitationAnswer,
}: {
  notification: NotificationItem
  onClick: () => void
  onMarkRead: () => void
  onProjectInvitationAnswer: (action: "accept" | "decline") => void
}) {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: vi,
  })
  const projectInvitationMeta = getProjectInvitationMeta(notification.metadata)

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/40",
        !notification.isRead && "bg-primary/[0.02]",
      )}
      onClick={onClick}
    >
      <div className="relative mt-0.5 shrink-0">
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

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-relaxed", !notification.isRead ? "font-medium text-foreground" : "text-muted-foreground")}>
          <span className="mr-1.5">{typeIcons[notification.type] ?? "🔔"}</span>
          {notification.message}
        </p>

        <div className="mt-1.5 flex items-center gap-3">
          <span className="text-xs text-muted-foreground/70">{timeAgo}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              notification.category === "DIRECT"
                ? "bg-primary/10 text-primary"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            )}
          >
            {notification.category === "DIRECT" ? "Dành cho tôi" : "Đang theo dõi"}
          </span>
          {notification.task && (
            <span className="max-w-[200px] truncate text-xs text-muted-foreground/60">
              {notification.task.title}
            </span>
          )}
        </div>

        {notification.type === "INVITATION_RECEIVED" && projectInvitationMeta && (
          <div className="mt-3 flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <Button
              size="sm"
              className="h-8 bg-primary text-xs hover:bg-primary/90"
              onClick={() => onProjectInvitationAnswer("accept")}
            >
              Chấp nhận
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => onProjectInvitationAnswer("decline")}
            >
              Từ chối
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Đánh dấu đã đọc"
            onClick={(event) => {
              event.stopPropagation()
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
