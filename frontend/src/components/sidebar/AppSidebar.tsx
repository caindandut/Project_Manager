import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ProjectNavigator } from "./ProjectNavigator"
import { SettingsNavigator } from "./SettingsNavigator"

interface AppSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function AppSidebar({ isOpen = true, onClose }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-14 z-50 flex h-[calc(100vh-3.5rem)] flex-col border-r bg-[#F4F5F7] transition-all duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-[72px]" : "w-[260px]",
          "lg:relative lg:translate-x-0"
        )}
      >
        {/* Collapse Toggle */}
        <div className={cn(
          "flex items-center border-b border-[#EBECF0] p-3",
          isCollapsed ? "justify-center" : "justify-end"
        )}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-[#172B4D] hover:bg-[#EBECF0]"
            onClick={toggleCollapsed}
            title={isCollapsed ? "Mở rộng" : "Thu nhỏ"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-6">
          <ProjectNavigator isCollapsed={isCollapsed} />
          <SettingsNavigator isCollapsed={isCollapsed} />
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="border-t border-[#EBECF0] p-3">
            <p className="text-xs text-muted-foreground text-center">
              Project Manager v1.0
            </p>
          </div>
        )}
      </aside>
    </>
  )
}
