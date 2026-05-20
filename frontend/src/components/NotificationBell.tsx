import { useState, useCallback } from "react"
import { Bell, Check, CheckCheck, ChevronRight, ExternalLink, Loader2, User2, Settings } from "lucide-react"
import NotificationSettingsDialog from "@/components/NotificationSettingsDialog"
import { useNavigate } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  useGroupedNotificationsQuery,
  useUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useMarkGroupAsReadMutation,
  useGroupDetailQuery,
} from "@/hooks/useNotifications"
import type { GroupedNotification, NotificationItem } from "@/types/notification"

// ── Type icon mapping ─────────────────────────────────────────────
const typeIcons: Record<string, string> = {
  TASK_ASSIGNED: "📋",
  TASK_STATUS_CHANGED: "🔄",
  TASK_COMMENTED: "💬",
  TASK_UPDATED: "✏️",
  MENTION: "📣",
  MEMBER_JOINED: "👤",
}

// ── Main Component ────────────────────────────────────────────────
export default function NotificationBell() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"DIRECT" | "WATCHING">("DIRECT")
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const unreadCountQuery = useUnreadCountQuery()
  const groupedQuery = useGroupedNotificationsQuery(activeTab, 10)
  const markAsReadMutation = useMarkAsReadMutation()
  const markAllAsReadMutation = useMarkAllAsReadMutation()
  const markGroupAsReadMutation = useMarkGroupAsReadMutation()
  const groupDetailQuery = useGroupDetailQuery(expandedGroup)

  const unreadCount = unreadCountQuery.data ?? 0
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount)
  const groups = groupedQuery.data?.data ?? []

  const handleNotificationClick = useCallback(
    (notification: NotificationItem) => {
      // Mark as read
      if (!notification.isRead) {
        markAsReadMutation.mutate(notification.id)
      }

      // Navigate to task
      if (notification.taskId && notification.task) {
        setIsOpen(false)
        // Navigate to the project task list and let the task detail panel open
        navigate(
          `/workspaces/_/projects/${notification.task.projectId}/list?taskId=${notification.taskId}`,
        )
      }
    },
    [markAsReadMutation, navigate],
  )

  const handleGroupClick = useCallback(
    (group: GroupedNotification) => {
      if (group.count > 1) {
        setExpandedGroup((prev) => (prev === group.groupKey ? null : group.groupKey))
        // Mark group as read
        if (group.hasUnread) {
          markGroupAsReadMutation.mutate(group.groupKey)
        }
      } else {
        handleNotificationClick(group.notification)
      }
    },
    [markGroupAsReadMutation, handleNotificationClick],
  )

  const handleMarkAllRead = useCallback(() => {
    markAllAsReadMutation.mutate(activeTab)
  }, [markAllAsReadMutation, activeTab])

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="relative border-border/80 bg-background hover:bg-accent"
          aria-label={`Thông báo${unreadCount ? `, ${badgeLabel} chưa đọc` : ""}`}
          title="Thông báo"
          id="notification-bell-trigger"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-4 text-white shadow-sm animate-in zoom-in-50">
              {badgeLabel}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[400px] max-h-[520px] p-0 overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Thông báo</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Đọc tất cả
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-7 w-7 text-muted-foreground hover:text-foreground p-0"
              onClick={() => {
                setIsOpen(false);
                setSettingsOpen(true);
              }}
              title="Cài đặt thông báo"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/50">
          <TabButton
            active={activeTab === "DIRECT"}
            onClick={() => { setActiveTab("DIRECT"); setExpandedGroup(null) }}
            badge={unreadCount}
          >
            Dành cho tôi
          </TabButton>
          <TabButton
            active={activeTab === "WATCHING"}
            onClick={() => { setActiveTab("WATCHING"); setExpandedGroup(null) }}
          >
            Đang theo dõi
          </TabButton>
        </div>

        {/* Content */}
        <div className="max-h-[360px] overflow-y-auto scrollbar-thin">
          {groupedQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="divide-y divide-border/30">
              {groups.map((group) => (
                <div key={group.groupKey}>
                  {/* Group header / single notification */}
                  <NotificationRow
                    notification={group.notification}
                    count={group.count}
                    hasUnread={group.hasUnread}
                    isExpanded={expandedGroup === group.groupKey}
                    onClick={() => handleGroupClick(group)}
                  />

                  {/* Expanded group detail */}
                  {expandedGroup === group.groupKey && group.count > 1 && (
                    <GroupDetailPanel
                      items={groupDetailQuery.data ?? []}
                      isLoading={groupDetailQuery.isLoading}
                      onItemClick={handleNotificationClick}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 p-2">
          <Button
            variant="ghost"
            className="w-full h-8 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/5"
            onClick={() => { setIsOpen(false); navigate("/notifications") }}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Xem tất cả thông báo
          </Button>
        </div>
      </PopoverContent>
    </Popover>

    <NotificationSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
  </>
)
}

// ── Sub-components ────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean
  onClick: () => void
  badge?: number
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      <span className="flex items-center justify-center gap-1.5">
        {children}
        {badge !== undefined && badge > 0 && (
          <span className="inline-flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500/90 px-1 text-[10px] font-semibold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  )
}

function NotificationRow({
  notification,
  count,
  hasUnread,
  isExpanded,
  onClick,
}: {
  notification: NotificationItem
  count: number
  hasUnread: boolean
  isExpanded: boolean
  onClick: () => void
}) {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: vi,
  })

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
        hasUnread && "bg-primary/[0.03]",
      )}
      onClick={onClick}
    >
      {/* Avatar / Icon */}
      <div className="relative mt-0.5 flex-shrink-0">
        {notification.actor?.avatar ? (
          <img
            src={notification.actor.avatar}
            alt={notification.actor.name}
            className="h-8 w-8 rounded-full object-cover ring-2 ring-background"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-background">
            <User2 className="h-4 w-4" />
          </div>
        )}
        {/* Unread dot */}
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-[13px] leading-snug line-clamp-2",
            hasUnread ? "text-foreground font-medium" : "text-muted-foreground",
          )}>
            <span className="mr-1">{typeIcons[notification.type] ?? "🔔"}</span>
            {notification.message}
          </p>
        </div>

        <div className="mt-1 flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground/70">{timeAgo}</span>
          {count > 1 && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {count} thay đổi
              <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
            </span>
          )}
        </div>
      </div>

      {/* Read indicator */}
      {!hasUnread && (
        <Check className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" />
      )}
    </button>
  )
}

function GroupDetailPanel({
  items,
  isLoading,
  onItemClick,
}: {
  items: NotificationItem[]
  isLoading: boolean
  onItemClick: (item: NotificationItem) => void
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 bg-muted/20">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="border-l-2 border-primary/20 ml-7 bg-muted/10">
      {items.map((item) => {
        const timeAgo = formatDistanceToNow(new Date(item.createdAt), {
          addSuffix: true,
          locale: vi,
        })

        return (
          <button
            key={item.id}
            type="button"
            className="flex w-full items-start gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
            onClick={() => onItemClick(item)}
          >
            <span className="mt-0.5 text-xs">{typeIcons[item.type] ?? "🔔"}</span>
            <div className="min-w-0 flex-1">
              <p className={cn(
                "text-[12px] leading-snug line-clamp-2",
                !item.isRead ? "text-foreground" : "text-muted-foreground",
              )}>
                {item.message}
              </p>
              <span className="text-[10px] text-muted-foreground/60">{timeAgo}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function EmptyState({ tab }: { tab: "DIRECT" | "WATCHING" }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
        <Bell className="h-5 w-5 text-muted-foreground/60" />
      </div>
      <p className="text-sm font-medium text-foreground/80">Không có thông báo</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {tab === "DIRECT"
          ? "Bạn sẽ thấy thông báo khi được giao công việc hoặc nhắc đến"
          : "Các cập nhật từ công việc bạn theo dõi sẽ hiển thị ở đây"}
      </p>
    </div>
  )
}
