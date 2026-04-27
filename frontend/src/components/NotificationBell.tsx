import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NotificationBellProps {
  unreadCount?: number
  className?: string
}

export default function NotificationBell({
  unreadCount = 3,
  className,
}: NotificationBellProps) {
  const visibleCount = Math.max(0, unreadCount)
  const badgeLabel = visibleCount > 99 ? "99+" : String(visibleCount)

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className={cn("relative border-border/80 bg-background hover:bg-accent", className)}
      aria-label={`Thông báo${visibleCount ? `, ${badgeLabel} chưa đọc` : ""}`}
      title="Thông báo"
    >
      <Bell className="h-4 w-4" />
      {visibleCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-4 text-white">
          {badgeLabel}
        </span>
      ) : null}
    </Button>
  )
}
