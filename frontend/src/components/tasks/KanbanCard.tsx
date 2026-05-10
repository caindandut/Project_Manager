import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { format, isPast, parseISO } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar, GripVertical } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Task } from "@/types/task"
import { TASK_PRIORITY_LABELS } from "@/types/task"

interface KanbanCardProps {
  task: Task
  projectKey: string
  onClick: () => void
  isDragging?: boolean
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
    <Badge
      variant="outline"
      className={cn("text-[10px] px-1.5 py-0 font-normal", styles[priority] || "")}
    >
      {TASK_PRIORITY_LABELS[priority as keyof typeof TASK_PRIORITY_LABELS] || priority}
    </Badge>
  )
}

export function KanbanCard({ task, projectKey, onClick, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id, data: { task, type: "task" } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue =
    task.dueDate && task.status !== "DONE" && task.status !== "CANCELLED"
      ? isPast(parseISO(task.dueDate))
      : false

  const dragging = isDragging || isSortableDragging

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group bg-card rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing select-none",
        "hover:border-primary hover:shadow-sm transition-all duration-200",
        dragging && "opacity-50 shadow-lg rotate-2 scale-105 z-50 cursor-grabbing"
      )}
      onClick={onClick}
    >
      {/* Code + Priority */}
      <div className="flex items-center gap-1.5 mb-2">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        <span className="text-[10px] font-mono text-muted-foreground/70">
          {projectKey}-{task.id}
        </span>
        {task.priority && (
          <PriorityBadge priority={task.priority} />
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-foreground/90 leading-snug mb-2 line-clamp-2">
        {task.title}
      </p>

      {/* Footer: Assignee + Due Date */}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5">
          {task.assignee ? (
            <Avatar className="h-5 w-5">
              <AvatarImage src={task.assignee.avatar ?? undefined} />
              <AvatarFallback className="text-[9px]">
                {task.assignee.name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-[10px] text-muted-foreground/50 italic">—</span>
          )}
        </div>
        {task.dueDate && (
          <div className={cn(
            "flex items-center gap-1 text-[10px]",
            isOverdue ? "text-red-500 font-medium" : "text-muted-foreground/70"
          )}>
            <Calendar className="h-3 w-3" />
            <span>{format(parseISO(task.dueDate), "dd/MM", { locale: vi })}</span>
          </div>
        )}
      </div>

      {/* Subtask count */}
      {(task.subTaskCount !== undefined || task._count?.subTasks !== undefined) && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground/60">
            {task.subTaskCount ?? task._count?.subTasks ?? 0} công việc con
          </span>
        </div>
      )}
    </div>
  )
}
