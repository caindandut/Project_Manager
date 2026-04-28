import { useState, useMemo } from "react"
import {
  CheckSquare,
  ListChecks,
  ClipboardList,
  UserCheck,
  Bookmark,
  Clock,
  ArrowUpRight,
  MessageSquare,
  Edit3,
  Plus,
  Activity,
} from "lucide-react"
import { format, parseISO, formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import apiClient from "@/lib/api-client"
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  type TaskStatus,
  type TaskPriority,
} from "@/types/task"

/* ─── Types ─── */

interface MyTaskItem {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  startDate: string | null
  createdAt: string
  updatedAt: string
  project: { id: number; name: string; key: string } | null
  assignee: { id: number; name: string; avatar: string | null } | null
}

interface MyActivity {
  id: number
  action: string
  entityType: string
  entityId: number
  field: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
  user: { id: number; name: string; avatar: string | null }
  task: { id: number; title: string; status: string } | null
  metadata: Record<string, unknown> | null
}

interface MyTasksData {
  assigned: MyTaskItem[]
  created: MyTaskItem[]
  activities: MyActivity[]
  stats: {
    totalAssigned: number
    totalCreated: number
  }
}

type TabKey = "summary" | "assigned" | "created" | "activity"

/* ─── Constants ─── */

const STATUS_COLORS: Record<string, string> = {
  TODO: "#6B7280",
  IN_PROGRESS: "#3B82F6",
  REVIEW: "#F59E0B",
  DONE: "#10B981",
  CANCELLED: "#9CA3AF",
}

const PRIORITY_COLORS: Record<string, string> = {
  HIGHEST: "#DC2626",
  HIGH: "#F97316",
  MEDIUM: "#F59E0B",
  LOW: "#3B82F6",
  LOWEST: "#9CA3AF",
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "summary", label: "Tóm tắt" },
  { key: "assigned", label: "Đã giao" },
  { key: "created", label: "Đã tạo" },
  { key: "activity", label: "Hoạt động" },
]

/* ─── Hook ─── */

function useMyTasksData() {
  return useQuery({
    queryKey: ["my-tasks-full"],
    queryFn: async (): Promise<MyTasksData> => {
      const response = await apiClient.get("/my-tasks")
      return response.data.data
    },
  })
}

/* ─── Sub Components ─── */

function TaskCard({ task }: { task: MyTaskItem }) {
  const priorityColor = PRIORITY_COLORS[task.priority] || "#9CA3AF"
  const isOverdue =
    task.dueDate &&
    task.status !== "DONE" &&
    task.status !== "CANCELLED" &&
    new Date(task.dueDate) < new Date()

  return (
    <div className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-border/50 bg-card hover:border-primary/25 hover:shadow-sm transition-all duration-200 cursor-pointer">
      {/* Priority dot */}
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: priorityColor }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground/90 truncate group-hover:text-foreground transition-colors">
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {task.project && (
            <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
              {task.project.key}
            </span>
          )}
          {task.project && (
            <span className="text-[11px] text-muted-foreground truncate">
              {task.project.name}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <Badge
        variant="outline"
        className="text-[10px] px-2 py-0.5 shrink-0 font-normal"
        style={{
          borderColor: `${STATUS_COLORS[task.status]}30`,
          color: STATUS_COLORS[task.status],
          backgroundColor: `${STATUS_COLORS[task.status]}08`,
        }}
      >
        {TASK_STATUS_LABELS[task.status] ?? task.status}
      </Badge>

      {/* Due date */}
      {task.dueDate && (
        <span
          className={cn(
            "text-[11px] shrink-0",
            isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
          )}
        >
          {format(parseISO(task.dueDate), "dd/MM/yyyy")}
        </span>
      )}

      {/* Assignee */}
      {task.assignee && (
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={task.assignee.avatar ?? undefined} />
          <AvatarFallback className="text-[9px] font-medium">
            {task.assignee.name?.[0] ?? "?"}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

function EmptyState({ message, icon: Icon }: { message: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color || "#3B82F6"}10` }}
      >
        <Icon className="h-5 w-5" style={{ color: color || "#3B82F6" }} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}

function WorkloadBar({ tasks }: { tasks: MyTaskItem[] }) {
  const statusEntries: { key: TaskStatus; label: string; color: string }[] = [
    { key: "TODO", label: "Việc cần làm", color: "#6B7280" },
    { key: "IN_PROGRESS", label: "Đang tiến hành", color: "#3B82F6" },
    { key: "REVIEW", label: "Xem xét", color: "#F59E0B" },
    { key: "DONE", label: "Hoàn thành", color: "#10B981" },
    { key: "CANCELLED", label: "Đã hủy", color: "#EF4444" },
  ]

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tasks) {
      map[t.status] = (map[t.status] || 0) + 1
    }
    return map
  }, [tasks])

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Khối lượng công việc</h3>
      <div className="flex gap-2 flex-wrap">
        {statusEntries.map((s) => (
          <div
            key={s.key}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-card min-w-[120px]"
          >
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
            <span className="text-sm font-bold text-foreground ml-auto">
              {counts[s.key] || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PriorityChart({ tasks }: { tasks: MyTaskItem[] }) {
  const priorityEntries: { key: string; label: string; color: string }[] = [
    { key: "HIGHEST", label: "Cao nhất", color: "#DC2626" },
    { key: "HIGH", label: "Cao", color: "#F97316" },
    { key: "MEDIUM", label: "Trung bình", color: "#F59E0B" },
    { key: "LOW", label: "Thấp", color: "#3B82F6" },
    { key: "LOWEST", label: "Thấp nhất", color: "#9CA3AF" },
  ]

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tasks) {
      map[t.priority] = (map[t.priority] || 0) + 1
    }
    return map
  }, [tasks])

  const maxCount = Math.max(1, ...Object.values(counts))

  return (
    <div className="p-4 rounded-xl border border-border/40 bg-card">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Mục công việc theo mức độ ưu tiên
      </h3>
      <div className="space-y-2.5">
        {priorityEntries.map((p) => {
          const count = counts[p.key] || 0
          const widthPercent = (count / maxCount) * 100
          return (
            <div key={p.key} className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground w-16 shrink-0 text-right">
                {p.label}
              </span>
              <div className="flex-1 h-5 bg-muted/30 rounded overflow-hidden">
                {count > 0 && (
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: p.color,
                      minWidth: "20px",
                    }}
                  />
                )}
              </div>
              <span className="text-xs font-semibold text-foreground w-6 text-right">
                {count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DonutChart({ tasks }: { tasks: MyTaskItem[] }) {
  const statusEntries: { key: string; label: string; color: string }[] = [
    { key: "TODO", label: "Việc cần làm", color: "#6B7280" },
    { key: "IN_PROGRESS", label: "Đang tiến hành", color: "#3B82F6" },
    { key: "REVIEW", label: "Xem xét", color: "#F59E0B" },
    { key: "DONE", label: "Hoàn thành", color: "#10B981" },
    { key: "CANCELLED", label: "Đã hủy", color: "#EF4444" },
  ]

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tasks) {
      map[t.status] = (map[t.status] || 0) + 1
    }
    return map
  }, [tasks])

  const total = tasks.length || 1

  // Build SVG donut segments
  const segments = useMemo(() => {
    const segs: { offset: number; length: number; color: string }[] = []
    let cumulative = 0
    const circumference = 2 * Math.PI * 40

    for (const s of statusEntries) {
      const count = counts[s.key] || 0
      if (count === 0) continue
      const length = (count / total) * circumference
      segs.push({
        offset: cumulative,
        length,
        color: s.color,
      })
      cumulative += length
    }
    return { segs, circumference }
  }, [counts, total])

  return (
    <div className="p-4 rounded-xl border border-border/40 bg-card">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Mục công việc theo trạng thái
      </h3>
      <div className="flex items-center gap-6">
        {/* SVG Donut */}
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="12"
            />
            {/* Data segments */}
            {segments.segs.map((seg, i) => (
              <circle
                key={i}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={seg.color}
                strokeWidth="12"
                strokeDasharray={`${seg.length} ${segments.circumference - seg.length}`}
                strokeDashoffset={-seg.offset}
                className="transition-all duration-500"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-foreground">{tasks.length}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-1.5 flex-1">
          {statusEntries.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <span className="text-xs font-semibold text-foreground">
                {counts[s.key] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ActivityItem({ activity }: { activity: MyActivity }) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE":
        return Plus
      case "UPDATE":
        return Edit3
      case "COMMENT":
        return MessageSquare
      default:
        return Activity
    }
  }

  const getActionLabel = (activity: MyActivity) => {
    const taskTitle = activity.task?.title || `#${activity.entityId}`

    if (activity.action === "CREATE") {
      return (
        <span>
          đã tạo công việc <strong className="font-medium text-foreground">{taskTitle}</strong>
        </span>
      )
    }

    if (activity.action === "UPDATE" && activity.field) {
      const fieldLabels: Record<string, string> = {
        status: "trạng thái",
        priority: "mức ưu tiên",
        title: "tiêu đề",
        description: "mô tả",
        assignee: "người phụ trách",
        dueDate: "ngày hết hạn",
        startDate: "ngày bắt đầu",
      }
      const fieldLabel = fieldLabels[activity.field] || activity.field

      let oldLabel = activity.oldValue || ""
      let newLabel = activity.newValue || ""

      if (activity.field === "status") {
        oldLabel = TASK_STATUS_LABELS[oldLabel as TaskStatus] || oldLabel
        newLabel = TASK_STATUS_LABELS[newLabel as TaskStatus] || newLabel
      }
      if (activity.field === "priority") {
        oldLabel = TASK_PRIORITY_LABELS[oldLabel as TaskPriority] || oldLabel
        newLabel = TASK_PRIORITY_LABELS[newLabel as TaskPriority] || newLabel
      }

      return (
        <span>
          đã thay đổi {fieldLabel} của{" "}
          <strong className="font-medium text-foreground">{taskTitle}</strong>
          {oldLabel && newLabel && (
            <span className="text-muted-foreground">
              {" "}từ <em>{oldLabel}</em> sang <em>{newLabel}</em>
            </span>
          )}
        </span>
      )
    }

    return (
      <span>
        đã thực hiện hành động trên{" "}
        <strong className="font-medium text-foreground">{taskTitle}</strong>
      </span>
    )
  }

  const Icon = getActionIcon(activity.action)
  const timeAgo = formatDistanceToNow(parseISO(activity.createdAt), {
    addSuffix: true,
    locale: vi,
  })

  return (
    <div className="flex gap-3 py-3">
      <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {getActionLabel(activity)}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </p>
      </div>
    </div>
  )
}

/* ─── Main Page ─── */

export default function MyTasksPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("summary")
  const { data, isLoading } = useMyTasksData()

  const assigned = data?.assigned ?? []
  const created = data?.created ?? []
  const activities = data?.activities ?? []

  // Combine all tasks for stats
  const allTasks = useMemo(() => {
    const taskMap = new Map<number, MyTaskItem>()
    for (const t of assigned) taskMap.set(t.id, t)
    for (const t of created) taskMap.set(t.id, t)
    return Array.from(taskMap.values())
  }, [assigned, created])

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <div className="flex items-center gap-2.5 mb-5">
          <CheckSquare className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Công việc của bạn</h1>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-border/50">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors relative",
                activeTab === tab.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {activeTab === "summary" && (
          <SummaryTab
            assigned={assigned}
            created={created}
            allTasks={allTasks}
            activities={activities}
          />
        )}
        {activeTab === "assigned" && (
          <TaskListTab tasks={assigned} emptyMessage="Chưa có công việc nào được giao cho bạn" />
        )}
        {activeTab === "created" && (
          <TaskListTab tasks={created} emptyMessage="Bạn chưa tạo công việc nào" />
        )}
        {activeTab === "activity" && (
          <ActivityTab activities={activities} />
        )}
      </div>
    </div>
  )
}

/* ─── Tab Content ─── */

function SummaryTab({
  assigned,
  created,
  allTasks,
  activities,
}: {
  assigned: MyTaskItem[]
  created: MyTaskItem[]
  allTasks: MyTaskItem[]
  activities: MyActivity[]
}) {
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Tổng quan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            icon={ClipboardList}
            label="Mục công việc đã tạo"
            value={created.length}
            color="#3B82F6"
          />
          <StatCard
            icon={UserCheck}
            label="Mục công việc đã giao"
            value={assigned.length}
            color="#F59E0B"
          />
          <StatCard
            icon={Bookmark}
            label="Mục công việc đã đăng ký"
            value={allTasks.length}
            color="#6366F1"
          />
        </div>
      </div>

      {/* Workload */}
      <WorkloadBar tasks={allTasks} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PriorityChart tasks={allTasks} />
        <DonutChart tasks={allTasks} />
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Hoạt động gần đây</h3>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Chưa có hoạt động nào.</p>
        ) : (
          <div className="divide-y divide-border/30">
            {activities.slice(0, 10).map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskListTab({
  tasks,
  emptyMessage,
}: {
  tasks: MyTaskItem[]
  emptyMessage: string
}) {
  if (tasks.length === 0) {
    return <EmptyState message={emptyMessage} icon={ListChecks} />
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}

function ActivityTab({ activities }: { activities: MyActivity[] }) {
  if (activities.length === 0) {
    return <EmptyState message="Chưa có hoạt động nào được ghi nhận" icon={ArrowUpRight} />
  }

  return (
    <div className="divide-y divide-border/30">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  )
}
