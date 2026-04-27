import { Link, useParams } from "react-router-dom"
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
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-[#172B4D] hover:bg-[#EBECF0]"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", isCollapsed && "h-5 w-5")} />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-normal">
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

  if (!workspaceId) {
    return null
  }

  const basePath = `/workspaces/${workspaceId}`

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-3">
        <Settings className="h-4 w-4 text-[#172B4D]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[#172B4D]">
          Cài đặt
        </span>
      </div>

      {/* Nav Items */}
      <div className="space-y-0.5">
        <NavItem
          icon={Users}
          label="Thành viên"
          href={`${basePath}/members`}
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={Settings}
          label="Cài đặt workspace"
          href={`${basePath}/settings`}
          isCollapsed={isCollapsed}
        />
      </div>
    </div>
  )
}
