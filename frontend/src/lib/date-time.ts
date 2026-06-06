import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns"
import { vi } from "date-fns/locale"

function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`)
  return parseISO(value)
}

export function formatTaskDateTime(value: string | Date | null | undefined): string {
  if (!value) return "Chưa có"
  const date = parseDateOnly(value)
  if (Number.isNaN(date.getTime())) return String(value)

  if (isToday(date)) return "Hôm nay"
  if (isTomorrow(date)) return "Ngày mai"
  if (isYesterday(date)) return "Hôm qua"
  return format(date, "dd/MM/yyyy", { locale: vi })
}

export function toDateTimeLocalValue(value: string | Date | null | undefined): string {
  if (!value) return ""
  const date = parseDateOnly(value)
  if (Number.isNaN(date.getTime())) return ""
  return format(date, "yyyy-MM-dd")
}

export function fromDateTimeLocalValue(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const dateOnly = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : undefined
}
