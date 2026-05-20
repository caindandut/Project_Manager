import {
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getLastWorkspaceSlug, setLastWorkspaceSlug } from "@/stores/authStore"
import { useWorkspacesQuery } from "@/hooks/useWorkspaces"
import { ProjectNavigator } from "./ProjectNavigator"

interface AppSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function AppSidebar({ isOpen = true, onClose }: AppSidebarProps) {
  const params = useParams()
  const urlWorkspaceSlug = params.workspaceId || ""
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [fallbackSlug, setFallbackSlug] = useState("")

  const workspacesQuery = useWorkspacesQuery(1, 20, {
    enabled: !urlWorkspaceSlug && !fallbackSlug
  })

  let activeWorkspaceSlug = urlWorkspaceSlug
  if (!activeWorkspaceSlug) {
    activeWorkspaceSlug = getLastWorkspaceSlug() || fallbackSlug
  }

  useEffect(() => {
    if (!urlWorkspaceSlug && !getLastWorkspaceSlug() && workspacesQuery.data?.data?.length) {
      setFallbackSlug(workspacesQuery.data.data[0].slug)
    }
  }, [urlWorkspaceSlug, workspacesQuery.data])

  useEffect(() => {
    if (urlWorkspaceSlug) {
      setLastWorkspaceSlug(urlWorkspaceSlug)
    }
  }, [urlWorkspaceSlug])

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-[60px]" : "w-[240px]",
          "lg:relative lg:z-40 lg:translate-x-0"
        )}
      >
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="mb-1 flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={() => setIsCollapsed((prev) => !prev)}
              title={isCollapsed ? "Mở rộng" : "Thu nhỏ"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          {activeWorkspaceSlug && <ProjectNavigator workspaceId={activeWorkspaceSlug} isCollapsed={isCollapsed} />}
        </nav>

      </aside>
    </>
  )
}
