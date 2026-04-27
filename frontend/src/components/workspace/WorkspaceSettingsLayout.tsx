import { Link } from "react-router-dom"
import { Settings2, Users } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type SettingsTab = "general" | "members"

interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  tab: SettingsTab
  isActive: boolean
  isCollapsed: boolean
}

function NavItem({ icon: Icon, label, tab, isActive, isCollapsed }: NavItemProps) {
  const basePath = window.location.pathname.replace(/\?.*/, "")
  const href = `${basePath}?tab=${tab}`

  const content = (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-[#DEEBFF] text-[#0052CC]"
          : "text-[#172B4D] hover:bg-[#EBECF0]",
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
        <TooltipContent side="right" className="font-normal bg-[#172B4D] text-white">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

interface WorkspaceSettingsLayoutProps {
  children: React.ReactNode
  activeTab: SettingsTab
}

export default function WorkspaceSettingsLayout({ children, activeTab }: WorkspaceSettingsLayoutProps) {
  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <aside className="w-[240px] shrink-0 border-r border-border bg-sidebar">
        <div className="flex h-full flex-col p-4">
          {/* Section header */}
          <div className="px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#5E6C84]">
              Cài đặt
            </span>
          </div>

          {/* Nav items */}
          <nav className="mt-1 space-y-1">
            <NavItem
              icon={Settings2}
              label="Chung"
              tab="general"
              isActive={activeTab === "general"}
              isCollapsed={false}
            />
            <NavItem
              icon={Users}
              label="Thành viên"
              tab="members"
              isActive={activeTab === "members"}
              isCollapsed={false}
            />
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background p-6">
        {children}
      </main>
    </div>
  )
}
