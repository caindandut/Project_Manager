import { useDraggable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { PRIORITY_COLORS } from "@/lib/calendar-utils"
import TaskAssigneeAvatars from "@/components/tasks/TaskAssigneeAvatars"
import type { Task } from "@/types/task"

interface CalendarTaskCardProps {
  task: Task
  onClick: (task: Task) => void
  compact?: boolean
}

export function CalendarTaskCard({ task, onClick, compact = true }: CalendarTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `calendar-task-${task.id}`,
    data: { task, type: "calendar-task" },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
      }
    : undefined

  const priorityColor = PRIORITY_COLORS[task.priority] || "#9CA3AF"

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation()
          onClick(task)
        }}
        className={cn(
          "group flex items-center gap-1.5 px-1.5 py-1 rounded-md text-xs cursor-grab active:cursor-grabbing",
          "hover:bg-accent/80 transition-colors duration-150",
          "border border-transparent hover:border-border/50",
          isDragging && "opacity-40 shadow-lg scale-105 z-50"
        )}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: priorityColor }}
        />
        <span className="truncate flex-1 text-foreground/85 font-medium leading-tight">
          {task.title}
        </span>
        <TaskAssigneeAvatars
          task={task}
          maxVisible={2}
          avatarClassName="h-4 w-4"
          countClassName="h-4 w-4 text-[7px]"
          fallbackClassName="text-[7px]"
          emptyClassName="hidden"
        />
      </div>
    )
  }

  // Expanded card (for week/day view)
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation()
        onClick(task)
      }}
      className={cn(
        "group flex items-start gap-2 px-2.5 py-2 rounded-lg text-sm cursor-grab active:cursor-grabbing",
        "bg-card border border-border/60 hover:border-primary/30 hover:shadow-sm",
        "transition-all duration-200",
        isDragging && "opacity-40 shadow-lg scale-105 z-50"
      )}
    >
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
        style={{ backgroundColor: priorityColor }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground/90 leading-snug truncate">
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {task.description}
          </p>
        )}
      </div>
      <TaskAssigneeAvatars
        task={task}
        maxVisible={3}
        avatarClassName="h-5 w-5"
        countClassName="h-5 w-5 text-[8px]"
        fallbackClassName="text-[8px]"
        emptyClassName="hidden"
      />
    </div>
  )
}
