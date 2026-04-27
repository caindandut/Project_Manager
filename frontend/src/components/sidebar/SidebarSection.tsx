import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface SidebarSectionProps {
  title?: string
  icon?: LucideIcon
  items: React.ReactNode
  isCollapsed?: boolean
  className?: string
}

export function SidebarSection({ title, icon: Icon, items, isCollapsed, className }: SidebarSectionProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {!isCollapsed && title && (
        <div className="flex items-center gap-2 px-3 py-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
        </div>
      )}
      {isCollapsed && Icon && (
        <div className="flex justify-center py-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-0.5">{items}</div>
    </div>
  )
}
