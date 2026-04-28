import { useState, useRef, useEffect } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  getDateKey,
  groupTasksByDate,
  formatFullDate,
  PRIORITY_COLORS,
} from "@/lib/calendar-utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/types/task"
import type { Task } from "@/types/task"

interface DayViewProps {
  currentDate: Date
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onQuickAdd: (date: Date, title: string) => Promise<void>
}

export function DayView({ currentDate, tasks, onTaskClick, onQuickAdd }: DayViewProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const dateKey = getDateKey(currentDate)
  const tasksByDate = groupTasksByDate(tasks)
  const dayTasks = tasksByDate.get(dateKey) || []

  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateKey}`,
    data: { date: currentDate, dateKey, type: "day-cell" },
  })

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const handleSubmit = async () => {
    const trimmed = title.trim()
    if (!trimmed) {
      setIsAdding(false)
      setTitle("")
      return
    }
    setIsSubmitting(true)
    try {
      await onQuickAdd(currentDate, trimmed)
      toast.success("Đã tạo công việc mới")
      setTitle("")
      setIsAdding(false)
    } catch {
      toast.error("Không thể tạo công việc")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === "Escape") {
      setIsAdding(false)
      setTitle("")
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-card rounded-lg border border-border/40 overflow-hidden">
      {/* Date header */}
      <div className="px-5 py-3 border-b border-border/40 bg-muted/30">
        <h3 className="text-base font-semibold capitalize text-foreground">
          {formatFullDate(currentDate)}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {dayTasks.length} công việc đến hạn
        </p>
      </div>

      {/* Tasks list */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-4 space-y-2 overflow-y-auto",
          "transition-colors duration-150",
          isOver && "bg-primary/5"
        )}
      >
        {dayTasks.length === 0 && !isAdding && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Không có công việc</p>
            <p className="text-xs mt-1">Bấm để thêm công việc cho ngày này</p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-3 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
            >
              + Thêm công việc
            </button>
          </div>
        )}

        {dayTasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onTaskClick(task)}
            className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border/50 hover:border-primary/30 hover:shadow-sm bg-background cursor-pointer transition-all duration-200 group"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0 mt-0.5"
              style={{ backgroundColor: PRIORITY_COLORS[task.priority] || "#9CA3AF" }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground/90 group-hover:text-foreground leading-snug">
                {task.title}
              </p>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS] ?? task.status}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {TASK_PRIORITY_LABELS[task.priority as keyof typeof TASK_PRIORITY_LABELS] ?? task.priority}
                </Badge>
              </div>
            </div>
            {task.assignee && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={task.assignee.avatar ?? undefined} />
                  <AvatarFallback className="text-[9px] font-medium">
                    {task.assignee.name?.[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {task.assignee.name}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Quick add */}
        {dayTasks.length > 0 && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground/60 hover:text-primary hover:bg-primary/5 rounded-lg border border-dashed border-border/50 hover:border-primary/30 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm công việc
          </button>
        )}

        {isAdding && (
          <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!title.trim()) setIsAdding(false)
              }}
              placeholder="Nhập tiêu đề công việc..."
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm rounded-lg border border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 bg-background"
            />
          </div>
        )}
      </div>
    </div>
  )
}
