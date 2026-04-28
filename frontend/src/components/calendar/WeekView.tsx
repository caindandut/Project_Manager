import { useState, useRef, useEffect } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  getWeekDays,
  getDateKey,
  groupTasksByDate,
  isToday,
  format,
} from "@/lib/calendar-utils"
import { vi } from "date-fns/locale"
import { CalendarTaskCard } from "./CalendarTaskCard"
import type { Task } from "@/types/task"

interface WeekViewProps {
  currentDate: Date
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onQuickAdd: (date: Date, title: string) => Promise<void>
}

function WeekDayColumn({
  date,
  tasks,
  onTaskClick,
  onQuickAdd,
}: {
  date: Date
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onQuickAdd: (date: Date, title: string) => Promise<void>
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dateKey = getDateKey(date)
  const today = isToday(date)

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
        "group/col flex flex-col border-r border-border/40 last:border-r-0 min-h-[400px]",
        "transition-colors duration-150",
        isOver && "bg-primary/5",
        today && "bg-primary/[0.02]"
      )}
    >
      {/* Column header */}
      <div
        className={cn(
          "sticky top-0 z-10 px-3 py-2.5 border-b border-border/40 text-center bg-muted/30",
          today && "bg-primary/5"
        )}
      >
        <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
          {format(date, "EEEE", { locale: vi })}
        </div>
        <div
          className={cn(
            "inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5",
            "text-sm font-semibold",
            today && "bg-primary text-primary-foreground",
            !today && "text-foreground/80"
          )}
        >
          {date.getDate()}
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-2 space-y-1 overflow-y-auto">
        {tasks.map((task) => (
          <CalendarTaskCard
            key={task.id}
            task={task}
            onClick={onTaskClick}
            compact={false}
          />
        ))}

        {tasks.length === 0 && !isAdding && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/40">
            Không có công việc
          </div>
        )}

        {/* Quick add */}
        {isAdding ? (
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!title.trim()) setIsAdding(false)
              }}
              placeholder="Tiêu đề..."
              disabled={isSubmitting}
              className="w-full px-2 py-1.5 text-xs rounded border border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 bg-background"
            />
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="opacity-0 group-hover/col:opacity-100 transition-opacity w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground/50 hover:text-primary hover:bg-primary/5 rounded-md mt-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm
          </button>
        )}
      </div>
    </div>
  )
}

export function WeekView({ currentDate, tasks, onTaskClick, onQuickAdd }: WeekViewProps) {
  const days = getWeekDays(currentDate)
  const tasksByDate = groupTasksByDate(tasks)

  return (
    <div className="flex flex-1 border border-border/40 rounded-lg overflow-hidden bg-card">
      {days.map((day) => {
        const key = getDateKey(day)
        const dayTasks = tasksByDate.get(key) || []
        return (
          <WeekDayColumn
            key={key}
            date={day}
            tasks={dayTasks}
            onTaskClick={onTaskClick}
            onQuickAdd={onQuickAdd}
          />
        )
      })}
    </div>
  )
}
