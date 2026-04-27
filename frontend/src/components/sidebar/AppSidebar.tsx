import {
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { useState } from "react"
import { useParams, useLocation, Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ProjectNavigator } from "./ProjectNavigator"

interface AppSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function AppSidebar({ isOpen = true, onClose }: AppSidebarProps) {
  const params = useParams()
  const location = useLocation()
  const workspaceSlug = params.workspaceId || ""
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev)
  }

  const isSettingsActive = location.pathname.includes("/settings")

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
          "fixed left-0 top-14 z-[60] flex h-[calc(100vh-3.5rem)] flex-col border-r bg-[#F4F5F7] transition-all duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-[60px]" : "w-[240px]",
          "lg:relative lg:top-0 lg:z-40 lg:h-screen lg:translate-x-0"
        )}
      >
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {/* Collapse Toggle - Only icon, inline */}
          <div className="flex items-center justify-end mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[#5E6C84] hover:bg-[#EBECF0] hover:text-[#172B4D]"
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

          {workspaceSlug && (
            <>
              {/* ProjectNavigator */}
              <ProjectNavigator workspaceId={workspaceSlug} isCollapsed={isCollapsed} />

              {/* Settings - Only show when collapsed */}
              {isCollapsed && (
                <div className="mt-1">
                  <Link
                    to={`/workspaces/${workspaceSlug}/settings`}
                    className={cn(
                      "flex items-center justify-center rounded-md py-2 transition-colors",
                      isSettingsActive
                        ? "bg-[#DEEBFF] text-[#0052CC]"
                        : "text-[#172B4D] hover:bg-[#EBECF0]"
                    )}
                    title="Cài đặt"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                  </Link>
                </div>
              )}
            </>
          )}
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="border-t border-[#EBECF0] p-3">
            <p className="text-[10px] text-[#5E6C84] text-center">
              Jira Mini v1.0
            </p>
          </div>
        )}
      </aside>
    </>
  )
}
