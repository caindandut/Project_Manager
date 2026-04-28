import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday as dateFnsIsToday,
  isSameMonth,
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
} from "date-fns"
import { vi } from "date-fns/locale"
import type { Task } from "@/types/task"

/**
 * Get all days to display in a month calendar grid (6 rows × 7 cols = 42 days).
 * Includes padding days from prev/next months.
 */
export function getMonthDays(date: Date): Date[] {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
}

/**
 * Get the 7 days of the week containing the given date.
 */
export function getWeekDays(date: Date): Date[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: weekStart, end: weekEnd })
}

/**
 * Group tasks by their dueDate into a Map keyed by "YYYY-MM-DD".
 * Tasks without a dueDate are excluded.
 */
export function groupTasksByDate(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>()

  for (const task of tasks) {
    if (!task.dueDate) continue
    const key = format(parseISO(task.dueDate), "yyyy-MM-dd")
    const existing = map.get(key) || []
    existing.push(task)
    map.set(key, existing)
  }

  return map
}

/**
 * Get the date key string for a Date object.
 */
export function getDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

/**
 * Format month/year header label.
 */
export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy", { locale: vi })
}

/**
 * Format a date for week view header.
 */
export function formatWeekDay(date: Date): string {
  return format(date, "EEEE, dd/MM", { locale: vi })
}

/**
 * Format a date for day view header.
 */
export function formatFullDate(date: Date): string {
  return format(date, "EEEE, dd MMMM yyyy", { locale: vi })
}

/**
 * Weekday header labels (Mon-Sun).
 */
export const WEEKDAY_LABELS = ["Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "CN"]

export {
  isSameDay,
  dateFnsIsToday as isToday,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  format,
  parseISO,
}

/**
 * Priority → color mapping for calendar task cards.
 */
export const PRIORITY_COLORS: Record<string, string> = {
  HIGHEST: "#DC2626",
  HIGH: "#F97316",
  MEDIUM: "#F59E0B",
  LOW: "#3B82F6",
  LOWEST: "#9CA3AF",
}

/**
 * Status → color mapping for calendar task cards.
 */
export const STATUS_COLORS: Record<string, string> = {
  TODO: "#6B7280",
  IN_PROGRESS: "#3B82F6",
  REVIEW: "#F59E0B",
  DONE: "#10B981",
  CANCELLED: "#9CA3AF",
}

export type CalendarViewMode = "month" | "week" | "day"
