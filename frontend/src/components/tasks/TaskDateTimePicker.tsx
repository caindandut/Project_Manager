import { useEffect, useMemo, useState } from "react"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { vi } from "date-fns/locale"
import { CalendarDays, Check, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toDateTimeLocalValue } from "@/lib/date-time"
import { cn } from "@/lib/utils"

interface TaskDateTimePickerProps {
  id?: string
  value?: string | null
  onChange: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const WEEK_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

function parseValue(value?: string | null): Date | null {
  if (!value) return null
  const date = value.includes("T") ? parseISO(value) : new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeDate(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function buildCalendarDays(monthDate: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 }),
  })
}

function formatTriggerValue(date: Date): string {
  return format(date, "dd/MM/yyyy", { locale: vi })
}

export function TaskDateTimePicker({
  id,
  value,
  onChange,
  placeholder = "Chọn ngày",
  disabled,
  className,
}: TaskDateTimePickerProps) {
  const selectedDate = parseValue(value)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date>(() => normalizeDate(selectedDate ?? new Date()))
  const [monthDate, setMonthDate] = useState<Date>(() => selectedDate ?? new Date())

  useEffect(() => {
    if (!open) return
    const next = normalizeDate(selectedDate ?? new Date())
    setDraft(next)
    setMonthDate(next)
  }, [open, selectedDate?.getTime()])

  const days = useMemo(() => buildCalendarDays(monthDate), [monthDate])
  const now = new Date()

  const updateDate = (day: Date) => {
    const next = normalizeDate(day)
    setDraft(next)
    setMonthDate(next)
  }

  const applyValue = () => {
    onChange(toDateTimeLocalValue(draft))
    setOpen(false)
  }

  const clearValue = () => {
    onChange(undefined)
    setOpen(false)
  }

  const chooseToday = () => {
    const today = normalizeDate(new Date())
    setDraft(today)
    setMonthDate(today)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between gap-2 rounded-md border-input bg-background px-3 text-left font-normal",
            "hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <span className={cn("min-w-0 truncate tabular-nums", !selectedDate && "text-muted-foreground")}>
            {selectedDate ? formatTriggerValue(selectedDate) : placeholder}
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        collisionPadding={12}
        className="w-[min(calc(100vw-1.5rem),312px)] overflow-hidden rounded-lg border-border p-0 shadow-2xl"
      >
        <div className="bg-popover text-popover-foreground">
          <div className="border-b border-border px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-sm font-semibold">Chọn ngày</span>
              </div>
              <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold tabular-nums text-primary">
                {formatTriggerValue(draft)}
              </span>
            </div>
          </div>

          <section className="p-3">
            <div className="rounded-lg border border-border bg-background p-2">
              <div className="mb-1.5 flex h-8 items-center justify-between gap-2">
                <span className="px-1 text-sm font-semibold capitalize">
                  {format(monthDate, "LLLL yyyy", { locale: vi })}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setMonthDate(subMonths(monthDate, 1))}
                    aria-label="Tháng trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setMonthDate(addMonths(monthDate, 1))}
                    aria-label="Tháng sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-muted-foreground">
                {WEEK_DAYS.map((day) => (
                  <div key={day} className="h-6 leading-6">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {days.map((day) => {
                  const selected = isSameDay(day, draft)
                  const today = isSameDay(day, now)

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => updateDate(day)}
                      onDoubleClick={applyValue}
                      className={cn(
                        "relative flex h-7 items-center justify-center rounded-md text-sm tabular-nums transition-colors",
                        "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                        !isSameMonth(day, monthDate) && "text-muted-foreground/45",
                        today && !selected && "font-semibold text-primary",
                        selected && "bg-primary font-semibold text-primary-foreground hover:bg-primary/95",
                      )}
                      aria-pressed={selected}
                    >
                      {format(day, "d")}
                      {today && !selected ? (
                        <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={clearValue}>
                <X className="h-4 w-4" />
                Xóa
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={chooseToday}>
                <RotateCcw className="h-4 w-4" />
                Hôm nay
              </Button>
            </div>
            <Button type="button" size="sm" className="h-8 gap-1.5 px-3" onClick={applyValue}>
              <Check className="h-4 w-4" />
              Chọn
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
