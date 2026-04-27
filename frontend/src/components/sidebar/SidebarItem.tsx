import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

interface SidebarItemProps {
  icon: LucideIcon
  label: string
  href: string
  isCollapsed?: boolean
  isActive?: boolean
  onClick?: () => void
}

export function SidebarItem({ icon: Icon, label, href, isCollapsed, isActive, onClick }: SidebarItemProps) {
  const location = useLocation()
  const active = isActive ?? location.pathname === href

  return (
    <Link
      to={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
        "hover:bg-accent hover:text-accent-foreground",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground",
        isCollapsed && "justify-center px-2",
      )}
      title={isCollapsed ? label : undefined}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}

interface SidebarItemButtonProps {
  icon: LucideIcon
  label: string
  isCollapsed?: boolean
  isActive?: boolean
  onClick?: () => void
  className?: string
}

export function SidebarItemButton({
  icon: Icon,
  label,
  isCollapsed,
  isActive,
  onClick,
  className,
}: SidebarItemButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
        "hover:bg-accent hover:text-accent-foreground",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground",
        isCollapsed && "justify-center px-2",
        className,
      )}
      title={isCollapsed ? label : undefined}
    >
      <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
  )
}
