import { useState, useMemo, useCallback } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import { addDays, formatDistance } from "date-fns"
import { vi } from "date-fns/locale"

import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import TaskDetailPanel from "@/components/tasks/TaskDetailPanel"

import {
  GanttProvider,
  GanttSidebar,
  GanttSidebarItem,
  GanttTimeline,
  GanttHeader,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureItem,
  GanttToday,
  type GanttFeature,
  type GanttStatus,
  type Range,
} from "@/components/kibo-ui/gantt"

import { useProjectDetailQuery } from "@/hooks/useProject"
import { useTasksQuery, useUpdateTaskMutation } from "@/hooks/useTasks"
import { useWorkspaceMembersQuery } from "@/hooks/useWorkspaces"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus as TaskStatusType } from "@/types/task"

// ─── Status color mapping ────────────────────────────────────────────────────

const STATUS_MAP: Record<TaskStatusType, GanttStatus> = {
  TODO: { id: "TODO", name: "Việc cần làm", color: "#6B7280" },
  IN_PROGRESS: { id: "IN_PROGRESS", name: "Đang tiến hành", color: "#3B82F6" },
  REVIEW: { id: "REVIEW", name: "Xem xét", color: "#F59E0B" },
  DONE: { id: "DONE", name: "Hoàn thành", color: "#10B981" },
  CANCELLED: { id: "CANCELLED", name: "Đã hủy", color: "#EF4444" },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function taskToGanttFeature(task: Task, projectKey: string): GanttFeature | null {
  const startDate = task.startDate ? new Date(task.startDate) : null
  const dueDate = task.dueDate ? new Date(task.dueDate) : null

  if (!startDate && !dueDate) return null

  const startAt = startDate ?? dueDate!
  const endAt = dueDate ?? addDays(startAt, 7)

  return {
    id: String(task.id),
    name: task.title,
    startAt,
    endAt,
    status: STATUS_MAP[task.status] ?? STATUS_MAP.TODO,
  }
}

// ─── Range toggle button group ────────────────────────────────────────────────

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "daily", label: "Tuần" },
  { value: "monthly", label: "Tháng" },
  { value: "quarterly", label: "Quý" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function GanttView() {
  const params = useParams<{ workspaceId: string; projectId: string }>()
  const workspaceId = params.workspaceId || ""
  const projectId = Number(params.projectId || "0")

  // State
  const [range, setRange] = useState<Range>("daily")
  const [zoom] = useState(100)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

  // Queries
  const projectQuery = useProjectDetailQuery(workspaceId, projectId)
  const project = projectQuery.data

  const tasksQuery = useTasksQuery(projectId)
  const allTasks: Task[] = tasksQuery.data?.data ?? []

  const membersQuery = useWorkspaceMembersQuery(workspaceId, 1, 50)
  const projectMembers = (membersQuery.data?.data ?? []).map((m) => m.user)

  const updateTaskMutation = useUpdateTaskMutation(projectId)

  const projectKey = project?.key ?? "PRJ"

  // Tasks with dates (visible on Gantt)
  const tasksWithDates = useMemo(
    () => allTasks.filter((t) => t.startDate || t.dueDate),
    [allTasks],
  )

  // Convert tasks to GanttFeatures
  const ganttFeatures = useMemo(() => {
    return tasksWithDates
      .map((t) => taskToGanttFeature(t, projectKey))
      .filter(Boolean) as GanttFeature[]
  }, [tasksWithDates, projectKey])

  // Count tasks without dates
  const tasksWithoutDates = useMemo(
    () => allTasks.filter((t) => !t.startDate && !t.dueDate).length,
    [allTasks],
  )

  // Drag/move handler → update startDate + dueDate on server
  const handleMove = useCallback(
    (id: string, startDate: Date, endDate: Date | null) => {
      const taskId = Number(id)
      updateTaskMutation.mutate(
        {
          taskId,
          payload: {
            startDate: startDate.toISOString().split("T")[0],
            dueDate: endDate ? endDate.toISOString().split("T")[0] : null,
          },
        },
        {
          onSuccess: () => toast.success("Đã cập nhật tiến trình công việc."),
          onError: (e) =>
            toast.error(toVietnameseErrorMessage(e, "Không thể cập nhật công việc.")),
        },
      )
    },
    [updateTaskMutation],
  )

  // Click sidebar item → open task detail panel
  const handleSelectItem = useCallback((id: string) => {
    setSelectedTaskId(Number(id))
  }, [])

  // ─── Loading skeleton ────────────────────────────────────────────────

  if (projectQuery.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header toolbar */}
      <div className="flex-shrink-0 px-6 pt-4 pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{project?.name ?? "Dự án"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Sơ đồ Gantt</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Task count */}
            <span className="text-sm text-muted-foreground">
              {ganttFeatures.length} mục công việc
            </span>

            {/* Range toggle buttons */}
            <div className="flex rounded-md border border-border overflow-hidden">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRange(opt.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors border-r border-border last:border-r-0",
                    range === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Today button */}
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
              const ganttEl = document.querySelector('.gantt') as HTMLElement
              if (!ganttEl) return
              const today = new Date()
              const startYear = today.getFullYear() - 1
              const colWidth = parseFloat(getComputedStyle(ganttEl).getPropertyValue('--gantt-column-width')) || 80

              let todayOffset: number
              if (range === "daily") {
                const timelineStart = new Date(startYear, 0, 1)
                const daysSinceStart = Math.floor((today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24))
                todayOffset = daysSinceStart * colWidth
              } else {
                const monthsSinceStart = (today.getFullYear() - startYear) * 12 + today.getMonth()
                todayOffset = monthsSinceStart * colWidth
              }

              ganttEl.scrollTo({ left: Math.max(0, todayOffset - ganttEl.clientWidth / 4), behavior: 'smooth' })
            }}>
              Hôm nay
            </Button>
          </div>
        </div>
      </div>

      {/* Notice for tasks without dates */}
      {tasksWithoutDates > 0 && (
        <div className="mx-6 mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 flex-shrink-0">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span>
            <strong>{tasksWithoutDates}</strong> công việc không có ngày bắt đầu hoặc ngày hết hạn nên không hiển thị trên sơ đồ Gantt.
          </span>
        </div>
      )}

      {/* Gantt Chart */}
      <div className="flex-1 min-h-0 px-4 py-2" style={{ overflow: 'hidden' }}>
        {ganttFeatures.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-muted-foreground">
                <path d="M3 3v18h18" />
                <rect x="7" y="10" width="3" height="8" rx="0.5" />
                <rect x="12" y="6" width="3" height="12" rx="0.5" />
                <rect x="17" y="13" width="3" height="5" rx="0.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Chưa có dữ liệu cho sơ đồ Gantt</p>
              <p className="text-xs text-muted-foreground mt-1">
                Thêm ngày bắt đầu và ngày hết hạn cho công việc để hiển thị trên sơ đồ Gantt.
              </p>
            </div>
          </div>
        ) : (
          <GanttProvider range={range} zoom={zoom}>
            {/* Sidebar */}
            <GanttSidebar>
              {tasksWithDates.map((task) => {
                const feature = taskToGanttFeature(task, projectKey)
                if (!feature) return null
                return (
                  <GanttSidebarItem
                    key={feature.id}
                    feature={{
                      ...feature,
                      name: task.title,
                    }}
                    onSelectItem={handleSelectItem}
                  />
                )
              })}
            </GanttSidebar>

            {/* Timeline */}
            <GanttTimeline>
              <GanttHeader />

              {/* Feature bars */}
              <GanttFeatureList>
                <GanttFeatureListGroup>
                  {tasksWithDates.map((task) => {
                    const feature = taskToGanttFeature(task, projectKey)
                    if (!feature) return null
                    return (
                      <GanttFeatureItem
                        key={feature.id}
                        {...feature}
                        onMove={handleMove}
                        onSelect={handleSelectItem}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: feature.status.color }}
                          />
                          <span className="flex-1 truncate text-xs font-medium">
                            {feature.name}
                          </span>
                          {task.assignee && (
                            <Avatar className="h-5 w-5 flex-shrink-0 border border-background">
                              <AvatarImage src={task.assignee.avatar || undefined} alt={task.assignee.name || task.assignee.email} />
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-medium">
                                {(task.assignee.name || task.assignee.email || "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </GanttFeatureItem>
                    )
                  })}
                </GanttFeatureListGroup>
              </GanttFeatureList>

              {/* Today marker */}
              <GanttToday />
            </GanttTimeline>
          </GanttProvider>
        )}
      </div>

      {/* Task detail panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        projectId={projectId}
        projectKey={projectKey}
        open={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        projectMembers={projectMembers}
      />
    </div>
  )
}
