import { getMonthDays, getDateKey, groupTasksByDate, WEEKDAY_LABELS } from "@/lib/calendar-utils"
import { DayCell } from "./DayCell"
import type { Task } from "@/types/task"

interface MonthViewProps {
  currentDate: Date
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onQuickAdd: (date: Date, title: string) => Promise<void>
  onShowAll?: (date: Date, tasks: Task[]) => void
}

export function MonthView({
  currentDate,
  tasks,
  onTaskClick,
  onQuickAdd,
  onShowAll,
}: MonthViewProps) {
  const days = getMonthDays(currentDate)
  const tasksByDate = groupTasksByDate(tasks)

  return (
    <div className="flex flex-col flex-1 border-t border-l border-border/40 rounded-lg overflow-hidden bg-card">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border/40">
        {WEEKDAY_LABELS.map((label, idx) => (
          <div
            key={idx}
            className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/40 bg-muted/30"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((day) => {
          const key = getDateKey(day)
          const dayTasks = tasksByDate.get(key) || []
          return (
            <DayCell
              key={key}
              date={day}
              currentMonth={currentDate}
              tasks={dayTasks}
              onTaskClick={onTaskClick}
              onQuickAdd={onQuickAdd}
              onShowAll={onShowAll}
            />
          )
        })}
      </div>
    </div>
  )
}
