import { useState, useMemo, useCallback } from "react"
import { useParams } from "react-router-dom"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  PointerActivationConstraint,
} from "@dnd-kit/core"
import { toast } from "sonner"

import { Skeleton } from "@/components/ui/skeleton"
import { CalendarToolbar } from "./CalendarToolbar"
import { MonthView } from "./MonthView"
import { WeekView } from "./WeekView"
import { DayView } from "./DayView"
import { CalendarTaskCard } from "./CalendarTaskCard"
import TaskDetailPanel from "@/components/tasks/TaskDetailPanel"

import { useProjectDetailQuery } from "@/hooks/useProject"
import { useTasksQuery } from "@/hooks/useTasks"
import { useWorkspaceMembersQuery } from "@/hooks/useWorkspaces"
import { createTask as createTaskApi, updateTask as updateTaskApi } from "@/lib/task-api"
import { queryClient } from "@/lib/query-client"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  formatMonthYear,
  getDateKey,
  format,
} from "@/lib/calendar-utils"
import { vi } from "date-fns/locale"
import type { CalendarViewMode } from "@/lib/calendar-utils"
import type { Task } from "@/types/task"

export function CalendarView() {
  const params = useParams<{ workspaceId: string; projectId: string }>()
  const workspaceId = params.workspaceId || ""
  const projectId = Number(params.projectId || "0")

  // State
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month")
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<number[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  // Queries
  const projectQuery = useProjectDetailQuery(workspaceId, projectId)
  const project = projectQuery.data

  const tasksQuery = useTasksQuery(projectId)
  const allTasks: Task[] = tasksQuery.data?.data ?? []

  const membersQuery = useWorkspaceMembersQuery(workspaceId, 1, 50)
  const projectMembers = (membersQuery.data?.data ?? []).map((m) => m.user)

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = allTasks
    if (priorityFilter.length > 0) {
      result = result.filter((t) => priorityFilter.includes(t.priority))
    }
    if (assigneeFilter.length > 0) {
      result = result.filter(
        (t) => t.assigneeId !== null && assigneeFilter.includes(t.assigneeId)
      )
    }
    return result
  }, [allTasks, priorityFilter, assigneeFilter])

  // DnD sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 } as PointerActivationConstraint,
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 } as PointerActivationConstraint,
  })
  const sensors = useSensors(mouseSensor, touchSensor)

  // Navigation
  const handlePrev = () => {
    setCurrentDate((d) => {
      if (viewMode === "month") return subMonths(d, 1)
      if (viewMode === "week") return subWeeks(d, 1)
      return subDays(d, 1)
    })
  }

  const handleNext = () => {
    setCurrentDate((d) => {
      if (viewMode === "month") return addMonths(d, 1)
      if (viewMode === "week") return addWeeks(d, 1)
      return addDays(d, 1)
    })
  }

  const handleToday = () => setCurrentDate(new Date())

  // Title
  const title = useMemo(() => {
    if (viewMode === "month") return formatMonthYear(currentDate)
    if (viewMode === "week") {
      return `Tuần ${format(currentDate, "wo", { locale: vi })} — ${format(currentDate, "MMMM yyyy", { locale: vi })}`
    }
    return format(currentDate, "dd MMMM yyyy", { locale: vi })
  }, [currentDate, viewMode])

  // Quick add handler
  const handleQuickAdd = useCallback(
    async (date: Date, taskTitle: string) => {
      const dateKey = getDateKey(date)
      await createTaskApi(projectId, {
        title: taskTitle,
        dueDate: dateKey,
        status: "TODO",
        priority: "MEDIUM",
      })
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
    },
    [projectId]
  )

  // Task click → open detail
  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id)
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { task?: Task } | undefined
    if (data?.task) {
      setActiveTask(data.task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null)

    const { active, over } = event
    if (!over) return

    const data = active.data.current as { task?: Task } | undefined
    const task = data?.task
    if (!task) return

    const overData = over.data.current as { dateKey?: string } | undefined
    const newDateKey = overData?.dateKey
    if (!newDateKey) return

    // Check if dropped on a different date
    const oldDateKey = task.dueDate ? getDateKey(new Date(task.dueDate)) : null
    if (newDateKey === oldDateKey) return

    try {
      await updateTaskApi(task.id, { dueDate: newDateKey })
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
      toast.success(`Đã chuyển "${task.title}" sang ngày ${newDateKey}`)
    } catch (e) {
      toast.error(toVietnameseErrorMessage(e, "Không thể cập nhật ngày hết hạn."))
    }
  }

  // Show all tasks in a day (popover / dialog - simplified: just switch to day view)
  const handleShowAll = (date: Date) => {
    setCurrentDate(date)
    setViewMode("day")
  }

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
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <div>
          <h1 className="text-xl font-semibold">{project?.name ?? "Dự án"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Lịch công việc</p>
        </div>
      </div>

      {/* Calendar container */}
      <div className="flex-1 flex flex-col px-6 py-4 overflow-hidden">
        <CalendarToolbar
          title={title}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          assigneeFilter={assigneeFilter}
          onAssigneeFilterChange={setAssigneeFilter}
          projectMembers={projectMembers}
        />

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-auto">
            {viewMode === "month" && (
              <MonthView
                currentDate={currentDate}
                tasks={filteredTasks}
                onTaskClick={handleTaskClick}
                onQuickAdd={handleQuickAdd}
                onShowAll={handleShowAll}
              />
            )}
            {viewMode === "week" && (
              <WeekView
                currentDate={currentDate}
                tasks={filteredTasks}
                onTaskClick={handleTaskClick}
                onQuickAdd={handleQuickAdd}
              />
            )}
            {viewMode === "day" && (
              <DayView
                currentDate={currentDate}
                tasks={filteredTasks}
                onTaskClick={handleTaskClick}
                onQuickAdd={handleQuickAdd}
              />
            )}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="w-48 opacity-90">
                <CalendarTaskCard
                  task={activeTask}
                  onClick={() => {}}
                  compact={viewMode === "month"}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task detail panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        projectId={projectId}
        projectKey={project?.key ?? "PRJ"}
        open={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        projectMembers={projectMembers}
      />
    </div>
  )
}
