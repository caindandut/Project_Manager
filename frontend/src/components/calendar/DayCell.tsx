import { useState, useRef, useEffect } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { isToday, isSameMonth, getDateKey } from "@/lib/calendar-utils"
import { CalendarTaskCard } from "./CalendarTaskCard"
import type { Task } from "@/types/task"

interface DayCellProps {
  date: Date
  currentMonth: Date
  tasks: Task[]
  maxVisible?: number
  onTaskClick: (task: Task) => void
  onQuickAdd: (date: Date, title: string) => Promise<void>
  onShowAll?: (date: Date, tasks: Task[]) => void
}

export function DayCell({
  date,
  currentMonth,
  tasks,
  maxVisible = 3,
  onTaskClick,
  onQuickAdd,
  onShowAll,
}: DayCellProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const dateKey = getDateKey(date)
  const today = isToday(date)
  const inMonth = isSameMonth(date, currentMonth)
  const dayNumber = date.getDate()
  const visibleTasks = tasks.slice(0, maxVisible)
  const hiddenCount = Math.max(0, tasks.length - maxVisible)

  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateKey}`,
    data: { date, dateKey, type: "day-cell" },
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
      await onQuickAdd(date, trimmed)
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
    <div
      ref={setNodeRef}
      className={cn(
        "group/cell relative flex flex-col min-h-[120px] border-b border-r border-border/40 p-1",
        "transition-colors duration-150",
        !inMonth && "bg-muted/30",
        isOver && "bg-primary/5 ring-1 ring-primary/20 ring-inset",
        today && "bg-primary/[0.03]"
      )}
    >
      {/* Day number header */}
      <div className="flex items-center justify-between px-1 mb-0.5">
        <span
          className={cn(
            "inline-flex items-center justify-center text-xs font-medium leading-none",
            "w-6 h-6 rounded-full",
            today && "bg-primary text-primary-foreground",
            !today && inMonth && "text-foreground/70",
            !today && !inMonth && "text-muted-foreground/40"
          )}
        >
          {dayNumber}
        </span>

        {/* Quick add button - visible on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsAdding(true)
          }}
          className={cn(
            "opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150",
            "w-5 h-5 rounded flex items-center justify-center",
            "text-muted-foreground/50 hover:text-primary hover:bg-primary/10"
          )}
          title="Thêm công việc"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 space-y-px overflow-hidden">
        {visibleTasks.map((task) => (
          <CalendarTaskCard
            key={task.id}
            task={task}
            onClick={onTaskClick}
            compact
          />
        ))}

        {hiddenCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onShowAll?.(date, tasks)
            }}
            className="w-full text-left px-1.5 py-0.5 text-[11px] font-medium text-primary/70 hover:text-primary hover:bg-primary/5 rounded transition-colors"
          >
            +{hiddenCount} công việc khác
          </button>
        )}
      </div>

      {/* Quick add inline form */}
      {isAdding && (
        <div className="mt-auto pt-1" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!title.trim()) {
                setIsAdding(false)
              }
            }}
            placeholder="Tiêu đề..."
            disabled={isSubmitting}
            className={cn(
              "w-full px-1.5 py-1 text-xs rounded border border-primary/30",
              "focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50",
              "bg-background placeholder:text-muted-foreground/40"
            )}
          />
        </div>
      )}
    </div>
  )
}
