import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface SidebarSectionProps {
  title?: string
  icon?: LucideIcon
  items?: React.ReactNode
  children?: React.ReactNode
  isCollapsed?: boolean
  className?: string
}

export function SidebarSection({ title, icon: Icon, items, children, isCollapsed, className }: SidebarSectionProps) {
  const content = children || items
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
      {content && <div className="space-y-0.5">{content}</div>}
    </div>
  )
}
