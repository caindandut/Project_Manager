import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"

import CreateTaskDialog from "@/components/tasks/CreateTaskDialog"
import TaskDetailPanel from "@/components/tasks/TaskDetailPanel"
import { TaskTable } from "@/components/tasks/TaskTable"
import { TaskToolbar, DEFAULT_COLUMNS } from "@/components/tasks/TaskToolbar"
import type { TaskFilter } from "@/components/tasks/task.types"
import { Skeleton } from "@/components/ui/skeleton"
import { useProjectDetailQuery } from "@/hooks/useProject"
import { useTasksQuery, useDeleteTaskMutation } from "@/hooks/useTasks"
import { useWorkspaceMembersQuery } from "@/hooks/useWorkspaces"
import { createTask as createTaskApi, updateTaskStatus as updateTaskStatusApi } from "@/lib/task-api"
import { queryClient, taskQueryKeys } from "@/lib/query-client"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import type { Task } from "@/types/task"
import { TASK_STATUS_LABELS } from "@/types/task"

interface ProjectTaskListPageProps {
  initialViewMode?: "flat" | "grouped" | "kanban"
}

export default function ProjectTaskListPage({ initialViewMode = "kanban" }: ProjectTaskListPageProps) {
  const params = useParams<{ workspaceId: string; projectId: string }>()
  const workspaceId = params.workspaceId || ""
  const projectId = Number(params.projectId || "0")

  const [filters, setFilters] = useState<TaskFilter>({})
  const [search, setSearch] = useState("")
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [viewMode, setViewMode] = useState<"flat" | "grouped" | "kanban">(initialViewMode)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [sortField, setSortField] = useState<string | undefined>()
  const [sortDir, setSortDir] = useState<"asc" | "desc" | undefined>()

  const projectQuery = useProjectDetailQuery(workspaceId, projectId)
  const project = projectQuery.data

  const tasksQuery = useTasksQuery(projectId, {
    ...filters,
    titleContains: search || undefined,
  })

  const membersQuery = useWorkspaceMembersQuery(workspaceId, 1, 50)
  const deleteMutation = useDeleteTaskMutation(projectId)

  const tasks: Task[] = tasksQuery.data?.data ?? []
  const totalTasks = tasksQuery.data?.meta?.total ?? 0

  // Listen for subtask detail open event from TaskDetailPanel
  useEffect(() => {
    const handleOpenTaskDetail = (e: Event) => {
      const customEvent = e as CustomEvent<{ taskId: number }>
      setSelectedTaskId(customEvent.detail.taskId)
    }
    window.addEventListener("openTaskDetail", handleOpenTaskDetail)
    return () => window.removeEventListener("openTaskDetail", handleOpenTaskDetail)
  }, [])

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id)
  }

  const handleTaskDelete = async (taskId: number) => {
    try {
      await deleteMutation.mutateAsync(taskId)
      toast.success("Đã xóa công việc.")
      if (selectedTaskId === taskId) setSelectedTaskId(null)
      tasksQuery.refetch()
    } catch (e) {
      toast.error(toVietnameseErrorMessage(e, "Không thể xóa công việc."))
    }
  }

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      const oldStatusLabel = task ? TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS] : "không xác định"
      const newStatusLabel = TASK_STATUS_LABELS[newStatus as keyof typeof TASK_STATUS_LABELS] || newStatus

      await updateTaskStatusApi(taskId, newStatus)

      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })

      toast.success(`Đã chuyển "${task?.title}" từ "${oldStatusLabel}" sang "${newStatusLabel}"`)
      tasksQuery.refetch()
    } catch (e) {
      toast.error(toVietnameseErrorMessage(e, "Không thể cập nhật trạng thái."))
    }
  }

  const handleSort = (field: string, dir: "asc" | "desc") => {
    setSortField(field)
    setSortDir(dir)
  }

  const handleCreateTask = async (payload: Parameters<typeof createTaskApi>[1]) => {
    await createTaskApi(projectId, payload)
    tasksQuery.refetch()
  }

  if (projectQuery.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold">
              {project?.name ?? "Dự án"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Danh sách công việc
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 px-6 py-4">
        <TaskToolbar
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          onCreateClick={() => setCreateDialogOpen(true)}
          columns={columns}
          onColumnsChange={setColumns}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalTasks={totalTasks}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <TaskTable
          tasks={tasks}
          isLoading={tasksQuery.isLoading}
          columns={columns}
          viewMode={viewMode}
          projectKey={project?.key ?? "PRJ"}
          projectId={projectId}
          onTaskClick={handleTaskClick}
          onTaskDelete={handleTaskDelete}
          onStatusChange={handleStatusChange}
          onSort={handleSort}
          onTasksChange={() => tasksQuery.refetch()}
          sortField={sortField as "title" | "priority" | "dueDate" | "createdAt" | undefined}
          sortDir={sortDir}
        />
      </div>

      {/* Detail panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        projectId={projectId}
        projectKey={project?.key ?? "PRJ"}
        open={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        projectMembers={(membersQuery.data?.data ?? []).map((m) => m.user)}
      />

      {/* Create dialog */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateTask}
        projectMembers={(membersQuery.data?.data ?? []).map((m) => m.user)}
      />
    </div>
  )
}
