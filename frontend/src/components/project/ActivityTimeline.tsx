import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Activity,
  CheckCircle2,
  Edit,
  FileUp,
  MessageSquare,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import type { ProjectActivity } from "@/lib/project-api"

// ── Helpers for mapping action + metadata to display ───────────

type ActivityType = "created" | "updated" | "completed" | "commented" | "deleted" | "attached" | "assigned"

function resolveActivityType(activity: ProjectActivity): ActivityType {
  const action = activity.action?.toUpperCase()
  const field = activity.metadata?.field

  if (action === "CREATE") return "created"
  if (action === "DELETE") return "deleted"
  if (action === "COMMENT" || action === "COMMENT_CREATE") return "commented"
  if (action === "ATTACH" || action === "ATTACHMENT_CREATE") return "attached"

  if (action === "UPDATE") {
    if (field === "status" && activity.metadata?.newValue === "DONE") return "completed"
    if (field === "assignee") return "assigned"
    return "updated"
  }

  return "updated"
}

const FIELD_LABELS: Record<string, string> = {
  status: "trạng thái",
  priority: "ưu tiên",
  title: "tiêu đề",
  description: "mô tả",
  dueDate: "hạn chót",
  startDate: "ngày bắt đầu",
  assignee: "người thực hiện",
}

const STATUS_LABELS: Record<string, string> = {
  TODO: "Cần làm",
  IN_PROGRESS: "Đang làm",
  REVIEW: "Xem xét",
  DONE: "Hoàn thành",
  CANCELLED: "Đã hủy",
}

const PRIORITY_LABELS: Record<string, string> = {
  LOWEST: "Thấp nhất",
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  HIGHEST: "Rất cao",
}

function humanizeValue(field: string | undefined, value: string | null | undefined): string {
  if (!value || value === "null") return "trống"
  if (field === "status") return STATUS_LABELS[value] || value
  if (field === "priority") return PRIORITY_LABELS[value] || value
  return value
}

function buildDescription(activity: ProjectActivity, type: ActivityType): string {
  const taskTitle = activity.task?.title || `#${activity.entityId}`
  const meta = activity.metadata
  const field = meta?.field

  switch (type) {
    case "created":
      return `đã tạo "${taskTitle}"`
    case "deleted":
      return `đã xóa "${taskTitle}"`
    case "completed":
      return `đã hoàn thành "${taskTitle}"`
    case "commented":
      return `đã bình luận trên "${taskTitle}"`
    case "attached":
      return `đã đính kèm tệp vào "${taskTitle}"`
    case "assigned":
      return `đã cập nhật người thực hiện của "${taskTitle}"`
    case "updated": {
      const fieldLabel = field ? FIELD_LABELS[field] || field : "thông tin"
      const oldVal = humanizeValue(field, meta?.oldValue)
      const newVal = humanizeValue(field, meta?.newValue)
      if (field && meta?.oldValue !== undefined && meta?.newValue !== undefined) {
        return `đã đổi ${fieldLabel} của "${taskTitle}" từ "${oldVal}" sang "${newVal}"`
      }
      return `đã cập nhật ${fieldLabel} của "${taskTitle}"`
    }
    default:
      return `đã thao tác trên "${taskTitle}"`
  }
}

// ── Icon config per type ──────────────────────────────────────

const ACTIVITY_ICON_CONFIG: Record<ActivityType, { icon: typeof Plus; color: string; bg: string }> = {
  created: { icon: Plus, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/40" },
  updated: { icon: Edit, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/40" },
  completed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/40" },
  commented: { icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/40" },
  deleted: { icon: Trash2, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/40" },
  attached: { icon: FileUp, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/40" },
  assigned: { icon: UserPlus, color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/40" },
}

// ── Component ─────────────────────────────────────────────────

interface ActivityTimelineProps {
  activities: ProjectActivity[] | undefined
  isLoading: boolean
}

export default function ActivityTimeline({ activities, isLoading }: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const items = activities ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Hoạt động gần đây
        </CardTitle>
        <CardDescription>Dòng thời gian các sự kiện trong dự án</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="rounded-full bg-muted p-3">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Chưa có hoạt động nào</p>
            <p className="mt-1 text-xs text-muted-foreground">Các thay đổi trong dự án sẽ xuất hiện ở đây</p>
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            {items.map((item) => {
              const type = resolveActivityType(item)
              const cfg = ACTIVITY_ICON_CONFIG[type]
              const Icon = cfg.icon
              const description = buildDescription(item, type)
              const userName = item.user.name || "Người dùng"

              return (
                <div key={item.id} className="relative flex gap-3 py-3">
                  <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm">
                      <span className="font-medium">{userName}</span>{" "}
                      <span className="text-muted-foreground">{description}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
