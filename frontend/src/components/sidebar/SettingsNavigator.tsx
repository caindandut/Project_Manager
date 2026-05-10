import { Link, useParams, useLocation } from "react-router-dom"
import { Settings, Users } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface SettingsNavigatorProps {
  isCollapsed: boolean
}

interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  isActive?: boolean
  isCollapsed?: boolean
}

function NavItem({ icon: Icon, label, href, isActive, isCollapsed }: NavItemProps) {
  const content = (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/20 text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-normal bg-popover text-popover-foreground">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

export function SettingsNavigator({ isCollapsed }: SettingsNavigatorProps) {
  const params = useParams()
  const workspaceId = params.workspaceId
  const location = useLocation()

  if (!workspaceId) {
    return null
  }

  const basePath = `/workspaces/${workspaceId}`
  const isMembersActive = location.pathname.includes("/members")
  const isSettingsActive = location.pathname.includes("/settings")

  if (isCollapsed) {
    return (
      <nav className="space-y-1 px-1">
        {/* Members */}
        <Link
          to={`${basePath}/members`}
          className={cn(
            "flex items-center justify-center rounded-md py-2 transition-colors",
            isMembersActive
              ? "bg-primary/20 text-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}
          title="Thành viên"
        >
          <Users className="h-4 w-4" />
        </Link>

        {/* Settings */}
        <Link
          to={`${basePath}/settings`}
          className={cn(
            "flex items-center justify-center rounded-md py-2 transition-colors",
            isSettingsActive
              ? "bg-primary/20 text-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}
          title="Cài đặt"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </nav>
    )
  }

  return (
    <div className="space-y-1">
      {/* Section Header */}
      <div className="px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cài đặt
        </span>
      </div>

      {/* Nav Items */}
      <NavItem
        icon={Users}
        label="Thành viên"
        href={`${basePath}/members`}
        isActive={isMembersActive}
      />
      <NavItem
        icon={Settings}
        label="Cài đặt workspace"
        href={`${basePath}/settings`}
        isActive={isSettingsActive}
      />
    </div>
  )
}
