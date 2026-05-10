import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { format, isPast, parseISO } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/types/task"
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/types/task"
import { KanbanBoard } from "./KanbanBoard"

type SortField = "title" | "priority" | "dueDate" | "createdAt"
type SortDir = "asc" | "desc"

interface TaskColumn {
  key: string
  label: string
  visible: boolean
}

interface TaskTableProps {
  tasks: Task[]
  isLoading: boolean
  columns: TaskColumn[]
  viewMode: "flat" | "grouped" | "kanban"
  projectKey: string
  projectId: number
  onTaskClick: (task: Task) => void
  onTaskDelete: (taskId: number) => void
  onStatusChange: (taskId: number, newStatus: TaskStatus) => void
  onSort: (field: SortField, dir: SortDir) => void
  onTasksChange: () => void
  sortField?: SortField
  sortDir?: SortDir
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    HIGHEST: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/70",
    HIGH: "bg-red-50 text-red-600 border-red-100 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/70",
    MEDIUM: "bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-950/35 dark:text-yellow-300 dark:border-yellow-900/70",
    LOW: "bg-gray-50 text-gray-500 border-gray-100 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    LOWEST: "bg-gray-50 text-gray-400 border-gray-100 dark:bg-slate-800/45 dark:text-slate-400 dark:border-slate-700",
  }
  return (
    <Badge variant="outline" className={cn("text-xs font-normal", styles[priority] || "")}>
      {TASK_PRIORITY_LABELS[priority as keyof typeof TASK_PRIORITY_LABELS] || priority}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    TODO: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    IN_PROGRESS: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/70",
    REVIEW: "bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-950/35 dark:text-yellow-300 dark:border-yellow-900/70",
    DONE: "bg-green-50 text-green-600 border-green-100 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/70",
    CANCELLED: "bg-red-50 text-red-400 border-red-100 dark:bg-red-950/35 dark:text-red-300 dark:border-red-900/70",
  }
  return (
    <Badge variant="outline" className={cn("text-xs font-normal", styles[status] || "")}>
      {TASK_STATUS_LABELS[status as keyof typeof TASK_STATUS_LABELS] || status}
    </Badge>
  )
}

function TaskRow({
  task,
  columns,
  projectKey,
  onTaskClick,
  onTaskDelete,
}: {
  task: Task
  columns: TaskColumn[]
  projectKey: string
  onTaskClick: (task: Task) => void
  onTaskDelete: (taskId: number) => void
}) {
  const isOverdue =
    task.dueDate && task.status !== "DONE" && task.status !== "CANCELLED"
      ? isPast(parseISO(task.dueDate))
      : false

  return (
    <tr
      className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors group"
      onClick={() => onTaskClick(task)}
    >
      {columns.find((c) => c.key === "code")?.visible && (
        <td className="px-3 py-2.5">
          <span className="text-xs font-mono text-muted-foreground">
            {projectKey}-{task.id}
          </span>
        </td>
      )}
      {columns.find((c) => c.key === "title")?.visible && (
        <td className="px-3 py-2.5 max-w-[280px]">
          <div className="flex items-start gap-2">
            {task.parentId && (
              <span className="text-[10px] text-muted-foreground mt-0.5">↳</span>
            )}
            <span className="font-medium text-sm text-foreground truncate">
              {task.title}
            </span>
          </div>
        </td>
      )}
      {columns.find((c) => c.key === "status")?.visible && (
        <td className="px-3 py-2.5">
          <StatusBadge status={task.status} />
        </td>
      )}
      {columns.find((c) => c.key === "priority")?.visible && (
        <td className="px-3 py-2.5">
          <PriorityBadge priority={task.priority} />
        </td>
      )}
      {columns.find((c) => c.key === "assignee")?.visible && (
        <td className="px-3 py-2.5">
          {task.assignee ? (
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assignee.avatar ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {task.assignee.name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-xs text-muted-foreground italic">—</span>
          )}
        </td>
      )}
      {columns.find((c) => c.key === "dueDate")?.visible && (
        <td className="px-3 py-2.5">
          {task.dueDate ? (
            <span
              className={cn(
                "text-xs",
                isOverdue ? "text-red-500 font-medium" : "text-muted-foreground",
              )}
            >
              {format(parseISO(task.dueDate), "dd/MM/yyyy", { locale: vi })}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground italic">—</span>
          )}
        </td>
      )}
      {columns.find((c) => c.key === "actions")?.visible && (
        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTaskClick(task)}>
                Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  toast.success(`Đã xóa công việc "${task.title}"`)
                  onTaskDelete(task.id)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      )}
    </tr>
  )
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField?: SortField; sortDir?: SortDir }) {
  if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
  return sortDir === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-primary" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-primary" />
  )
}

const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"]

function StatusGroup({
  status,
  tasks,
  columns,
  projectKey,
  onTaskClick,
  onTaskDelete,
  onStatusChange,
}: {
  status: TaskStatus
  tasks: Task[]
  columns: TaskColumn[]
  projectKey: string
  onTaskClick: (task: Task) => void
  onTaskDelete: (taskId: number) => void
  onStatusChange: (taskId: number, newStatus: TaskStatus) => void
}) {
  const [expanded, setExpanded] = useState(true)

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData("taskId", String(task.id))
    e.dataTransfer.setData("fromStatus", task.status)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const taskId = Number(e.dataTransfer.getData("taskId"))
    const fromStatus = e.dataTransfer.getData("fromStatus")
    if (fromStatus !== status && !isNaN(taskId)) {
      onStatusChange(taskId, status)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Group header */}
      <button
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/60 hover:bg-muted transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <StatusBadge status={status} />
        <span className="text-xs text-muted-foreground font-normal">
          {tasks.length} công việc
        </span>
      </button>

      {/* Group rows */}
      {expanded && (
        <div onDrop={handleDrop} onDragOver={handleDragOver}>
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground italic">
              Chưa có công việc
            </div>
          ) : (
            tasks.map((task) => {
              const isOverdue =
                task.dueDate && task.status !== "DONE" && task.status !== "CANCELLED"
                  ? isPast(parseISO(task.dueDate))
                  : false

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors group"
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onClick={() => onTaskClick(task)}
                >
                  {/* Left side: Code + Title */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {columns.find((c) => c.key === "code")?.visible && (
                      <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">
                        {projectKey}-{task.id}
                      </span>
                    )}
                    {columns.find((c) => c.key === "title")?.visible && (
                      <span className="text-sm font-medium truncate">
                        {task.title}
                      </span>
                    )}
                  </div>

                  {/* Right side: Priority + Assignee + DueDate + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {columns.find((c) => c.key === "priority")?.visible && (
                      <PriorityBadge priority={task.priority} />
                    )}
                    {columns.find((c) => c.key === "assignee")?.visible && (
                      task.assignee ? (
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={task.assignee.avatar ?? undefined} />
                          <AvatarFallback className="text-[9px]">
                            {task.assignee.name?.[0] ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">—</span>
                      )
                    )}
                    {columns.find((c) => c.key === "dueDate")?.visible && (
                      task.dueDate ? (
                        <span className={cn(
                          "text-[11px]",
                          isOverdue ? "text-red-500 font-medium" : "text-muted-foreground",
                        )}>
                          {format(parseISO(task.dueDate), "dd/MM/yyyy", { locale: vi })}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">—</span>
                      )
                    )}
                    {columns.find((c) => c.key === "actions")?.visible && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onTaskClick(task)}>
                              Xem chi tiết
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                toast.success(`Đã xóa công việc "${task.title}"`)
                                onTaskDelete(task.id)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export function TaskTable({
  tasks,
  isLoading,
  columns,
  viewMode,
  projectKey,
  projectId,
  onTaskClick,
  onTaskDelete,
  onStatusChange,
  onSort,
  onTasksChange,
  sortField,
  sortDir,
}: TaskTableProps) {
  if (isLoading) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border border-border rounded-lg">
        <svg
          className="h-12 w-12 text-muted-foreground/30 mb-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <p className="text-sm font-medium text-muted-foreground">Chưa có công việc nào</p>
        <p className="text-xs text-muted-foreground mt-1">
          Tạo công việc đầu tiên để bắt đầu
        </p>
      </div>
    )
  }

  if (viewMode === "grouped") {
    return (
      <div className="space-y-3">
        {STATUS_ORDER.map((status) => {
          const statusTasks = tasks.filter((t) => t.status === status)
          return (
            <StatusGroup
              key={status}
              status={status}
              tasks={statusTasks}
              columns={columns}
              projectKey={projectKey}
              onTaskClick={onTaskClick}
              onTaskDelete={onTaskDelete}
              onStatusChange={onStatusChange}
            />
          )
        })}
      </div>
    )
  }

  if (viewMode === "kanban") {
    return (
      <KanbanBoard
        tasks={tasks}
        isLoading={isLoading}
        projectId={projectId}
        projectKey={projectKey}
        onTaskClick={onTaskClick}
        onStatusChange={onStatusChange}
        onTasksChange={onTasksChange}
      />
    )
  }

  // Flat mode — sort data
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!sortField || !sortDir) return 0
    let cmp = 0
    if (sortField === "title") cmp = a.title.localeCompare(b.title)
    else if (sortField === "priority") {
      const order = ["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"]
      cmp = order.indexOf(a.priority) - order.indexOf(b.priority)
    } else if (sortField === "dueDate") {
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
      cmp = aDate - bDate
    } else if (sortField === "createdAt") {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    return sortDir === "asc" ? cmp : -cmp
  })

  const visibleCols = columns.filter((c) => c.visible)
  const sortableHeaders: Array<{ key: SortField; label: string }> = [
    { key: "title", label: "Tiêu đề" },
    { key: "priority", label: "Mức ưu tiên" },
    { key: "dueDate", label: "Ngày hết hạn" },
    { key: "createdAt", label: "Ngày tạo" },
  ]

  const handleHeaderClick = (field: SortField) => {
    const newDir: SortDir =
      sortField === field && sortDir === "asc" ? "desc" : "asc"
    onSort(field, newDir)
  }

  return (
    <div className="border border-border rounded-lg overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            {visibleCols.map((col) => {
              const sortConfig = sortableHeaders.find((h) => h.key === col.key)
              return (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap",
                    sortConfig ? "cursor-pointer hover:text-foreground select-none" : "",
                  )}
                  onClick={sortConfig ? () => handleHeaderClick(sortConfig.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortConfig && (
                      <SortIcon field={sortConfig.key} sortField={sortField} sortDir={sortDir} />
                    )}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              columns={columns}
              projectKey={projectKey}
              onTaskClick={onTaskClick}
              onTaskDelete={onTaskDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
