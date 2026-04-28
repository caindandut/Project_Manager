import { useState } from "react"
import {
  BarChart3,
  Calendar,
  CheckSquare,
  ChevronDown,
  FolderKanban,
  Home,
  KanbanSquare,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from "lucide-react"
import { Link, useLocation, useParams } from "react-router-dom"

import { SidebarItem } from "./SidebarItem"
import { SidebarSection } from "./SidebarSection"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useWorkspaceDetailQuery } from "@/hooks/useWorkspaces"

const PERSONAL_ITEMS = [
  { key: "home", label: "Trang chủ", icon: Home, href: "/workspaces" },
]

const WORKSPACE_ITEMS = [
  { key: "overview", label: "Tổng quan", icon: LayoutDashboard, href: "" },
  { key: "my-tasks", label: "Công việc của tôi", icon: CheckSquare, href: "my-tasks" },
  { key: "projects", label: "Dự án", icon: FolderKanban, href: "projects" },
  { key: "board", label: "Bảng", icon: KanbanSquare, href: "board" },
  { key: "calendar", label: "Lịch", icon: Calendar, href: "calendar" },
  { key: "members", label: "Thành viên", icon: Users, href: "members" },
  { key: "reports", label: "Báo cáo", icon: BarChart3, href: "reports" },
]

const PROJECT_ITEMS = [
  { key: "project-overview", label: "Tổng quan", icon: LayoutDashboard, href: "overview" },
  { key: "project-tasks", label: "Công việc", icon: KanbanSquare, href: "tasks" },
  { key: "project-board", label: "Bảng", icon: KanbanSquare, href: "board" },
  { key: "project-calendar", label: "Lịch", icon: Calendar, href: "calendar" },
]

export default function SidebarNav() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isProjectsOpen, setIsProjectsOpen] = useState(true)
  const location = useLocation()
  const params = useParams()

  const workspaceSlug = params.workspaceId || ""
  const projectId = params.projectId
  const workspaceQuery = useWorkspaceDetailQuery(workspaceSlug)

  const workspace = workspaceQuery.data
  const basePath = workspaceSlug ? `/workspaces/${workspaceSlug}` : ""
  const projectBasePath = projectId ? `${basePath}/projects/${projectId}` : ""

  const isInProject = Boolean(projectId)
  const currentWorkspaceItems = WORKSPACE_ITEMS.map((item) => ({
    ...item,
    href: item.key === "overview" ? basePath : `${basePath}/${item.href}`,
  }))
  const currentProjectItems = PROJECT_ITEMS.map((item) => ({
    ...item,
    href: `${projectBasePath}/${item.href}`,
  }))

  const getCurrentKey = () => {
    if (isInProject) {
      const projectMatch = PROJECT_ITEMS.find((item) =>
        location.pathname.endsWith(`/${item.href}`)
      )
      return projectMatch?.key || "project-overview"
    }
    const match = WORKSPACE_ITEMS.find((item) => {
      if (item.key === "overview") return location.pathname === basePath
      return location.pathname.startsWith(`${basePath}/${item.href}`)
    })
    return match?.key || "home"
  }

  const currentKey = getCurrentKey()

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        isCollapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
        {!isCollapsed ? (
          <Link to="/workspaces" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FolderKanban className="h-4 w-4" />
            </div>
            <span className="font-semibold">Project Manager</span>
          </Link>
        ) : (
          <Link
            to="/workspaces"
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground"
          >
            <FolderKanban className="h-4 w-4" />
          </Link>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Personal Section */}
        <SidebarSection title="Cá nhân" isCollapsed={isCollapsed}>
          {PERSONAL_ITEMS.map((item) => (
            <SidebarItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              href={item.href}
              isCollapsed={isCollapsed}
              isActive={item.key === currentKey}
            />
          ))}
        </SidebarSection>

        {/* Workspace Section */}
        {Boolean(workspaceSlug) && (
          <SidebarSection
            title={workspace?.name || "Workspace"}
            icon={isCollapsed ? FolderKanban : undefined}
            items={null}
            isCollapsed={isCollapsed}
          >
            {!isCollapsed && workspaceQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-3/4" />
              </div>
            ) : (
              currentWorkspaceItems.map((item) => {
                if (item.key === "projects" && !isCollapsed) {
                  return (
                    <Collapsible
                      key={item.key}
                      open={isProjectsOpen}
                      onOpenChange={setIsProjectsOpen}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                            "hover:bg-accent hover:text-accent-foreground",
                            currentKey === item.key
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 shrink-0",
                            currentKey === item.key && "text-primary"
                          )} />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            isProjectsOpen && "rotate-180"
                          )} />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-1 ml-4 space-y-0.5 border-l border-border pl-4">
                        <SidebarItem
                          icon={FolderKanban}
                          label="Tất cả dự án"
                          href={item.href}
                          isActive={location.pathname === item.href}
                        />
                        {/* Project list items can be added here when we have project data */}
                      </CollapsibleContent>
                    </Collapsible>
                  )
                }
                return (
                  <SidebarItem
                    key={item.key}
                    icon={item.icon}
                    label={item.label}
                    href={item.href}
                    isCollapsed={isCollapsed}
                    isActive={currentKey === item.key}
                  />
                )
              })
            )}
          </SidebarSection>
        )}

        {/* Project Section */}
        {isInProject && (
          <SidebarSection
            title="Dự án"
            icon={isCollapsed ? KanbanSquare : undefined}
            items={null}
            isCollapsed={isCollapsed}
          >
            {currentProjectItems.map((item) => (
              <SidebarItem
                key={item.key}
                icon={item.icon}
                label={item.label}
                href={item.href}
                isCollapsed={isCollapsed}
                isActive={item.key === currentKey}
              />
            ))}
          </SidebarSection>
        )}
      </nav>

      {/* Footer with workspace switcher */}
      {!isCollapsed && (
        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/workspaces"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-muted text-xs">WS</AvatarFallback>
            </Avatar>
            <span className="truncate">Chuyển workspace</span>
          </Link>
        </div>
      )}
    </aside>
  )
}
