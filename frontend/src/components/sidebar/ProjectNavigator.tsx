import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Folder,
  Home,
  LayoutDashboard,
  LayoutGrid,
  List,
  Plus,
  Settings,
  TrendingUp,
} from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { useProjectsQuery } from "@/hooks/useProjects"
import { cn } from "@/lib/utils"

interface ProjectNavigatorProps {
  workspaceId: string | number
  isCollapsed?: boolean
}

interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  isActive?: boolean
  indent?: boolean
  isCollapsed?: boolean
  children?: React.ReactNode
  onClick?: () => void
}

export function SidebarItem({
  icon: Icon,
  label,
  href,
  isActive,
  indent,
  isCollapsed,
  children,
  onClick,
}: SidebarItemProps) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = !!children

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault()
      setExpanded(!expanded)
      onClick?.()
    }
  }

  if (isCollapsed) {
    return (
      <Link
        to={hasChildren ? "#" : href}
        onClick={handleClick}
        className={cn(
          "flex items-center justify-center rounded-md py-2 transition-colors cursor-pointer",
          isActive
            ? "bg-primary/20 text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent"
        )}
        title={label}
      >
        <Icon className="h-4 w-4 shrink-0" />
      </Link>
    )
  }

  const content = (
    <Link
      to={hasChildren ? "#" : href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
        isActive
          ? "bg-primary/20 text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent",
        indent && "ml-5",
        hasChildren && "justify-between"
      )}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      {hasChildren && (
        <span className="ml-auto">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
      )}
    </Link>
  )

  if (hasChildren) {
    return (
      <div>
        {content}
        {expanded && (
          <div className="mt-1 space-y-0.5">
            {children}
          </div>
        )}
      </div>
    )
  }

  return content
}

interface ProjectViewItemProps {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
  isCollapsed?: boolean
}

export function ProjectViewItem({ label, href, icon: Icon, isActive, isCollapsed }: ProjectViewItemProps) {
  if (isCollapsed) {
    return (
      <Link
        to={href}
        className={cn(
          "flex items-center justify-center rounded-md py-1.5 transition-colors",
          isActive
            ? "bg-primary/20 text-primary"
            : "text-muted-foreground hover:bg-sidebar-accent"
        )}
        title={label}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </Link>
    )
  }

  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-2 rounded-md py-1.5 text-sm transition-colors",
        "px-3 ml-4 border-l border-sidebar-border pl-4",
        isActive
          ? "bg-primary/20 text-primary font-medium"
          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  )
}

interface ProjectItemProps {
  project: {
    id: number
    name: string
    key?: string
  }
  workspaceId: string | number
  isActive: boolean
  isCollapsed?: boolean
  defaultExpanded?: boolean
}

export function ProjectItem({ project, workspaceId, isActive, isCollapsed, defaultExpanded = false }: ProjectItemProps) {
  const location = useLocation()
  const projectPath = `/workspaces/${workspaceId}/projects/${project.id}`
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const viewItems = [
    { label: "Tổng quan", href: `${projectPath}/overview`, icon: LayoutDashboard },
    { label: "Bảng", href: `${projectPath}/kanban`, icon: LayoutGrid },
    { label: "Danh sách", href: `${projectPath}/list`, icon: List },
    { label: "Lịch", href: `${projectPath}/calendar`, icon: Calendar },
    { label: "Gantt", href: `${projectPath}/gantt`, icon: TrendingUp },
  ]

  if (isCollapsed) {
    return (
      <div className="space-y-1">
        <Link
          to={projectPath}
          className={cn(
            "flex items-center justify-center rounded-md py-2 transition-colors",
            isActive
              ? "bg-sidebar-accent text-sidebar-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent"
          )}
          title={project.name}
        >
          <Folder className="h-4 w-4 shrink-0" />
        </Link>
        {isExpanded && (
          <div className="space-y-0.5">
            {viewItems.map((item) => (
              <ProjectViewItem
                key={item.href}
                label={item.label}
                href={item.href}
                icon={item.icon}
                isActive={location.pathname === item.href}
                isCollapsed={true}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors",
          isActive || isExpanded
            ? "bg-sidebar-accent text-sidebar-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <Folder className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate font-medium">{project.name}</span>
      </div>

      {isExpanded && (
        <div className="mt-1 space-y-0.5">
          {viewItems.map((item) => (
            <ProjectViewItem
              key={item.href}
              label={item.label}
              href={item.href}
              icon={item.icon}
              isActive={location.pathname === item.href}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ProjectNavigator({ workspaceId, isCollapsed }: ProjectNavigatorProps) {
  const location = useLocation()
  const projectsQuery = useProjectsQuery(workspaceId)
  const projects = projectsQuery.data?.data ?? []

  const basePath = `/workspaces/${workspaceId}`
  const isInProject = location.pathname.includes("/projects/")

  if (isCollapsed) {
    return (
      <nav className="space-y-1 px-1">
        {/* Home */}
        <SidebarItem
          icon={Home}
          label="Trang chủ"
          href={basePath}
          isActive={location.pathname === basePath && !isInProject}
          isCollapsed={true}
        />

        {/* My Tasks */}
        <SidebarItem
          icon={CheckSquare}
          label="Công việc của tôi"
          href={`${basePath}/my-tasks`}
          isActive={location.pathname === `${basePath}/my-tasks`}
          isCollapsed={true}
        />

        {/* Projects folder icon */}
        <div className="flex items-center justify-center py-2">
          <Folder className="h-4 w-4 text-muted-foreground" />
        </div>
      </nav>
    )
  }

  return (
    <nav className="space-y-1">
      {/* Home */}
      <SidebarItem
        icon={Home}
        label="Trang chủ"
        href={basePath}
        isActive={location.pathname === basePath && !isInProject}
      />

      {/* My Tasks */}
      <SidebarItem
        icon={CheckSquare}
        label="Công việc của tôi"
        href={`${basePath}/my-tasks`}
        isActive={location.pathname === `${basePath}/my-tasks`}
      />

      {/* Projects section */}
      <div className="pt-2">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dự án
            </span>
          </div>
          <Link
            to={`/workspaces/${workspaceId}/projects/new`}
            className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-primary transition-colors"
            title="Tạo dự án"
          >
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>

        {projectsQuery.isLoading ? (
          <div className="px-2 space-y-1">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">Chưa có dự án nào</p>
            <Link
              to={`/workspaces/${workspaceId}/projects/new`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="h-3 w-3" />
              Tạo dự án mới
            </Link>
          </div>
        ) : (
          <div className="space-y-0.5">
            {projects.map((project) => {
              const isActive = location.pathname.includes(`/projects/${project.id}`)
              return (
                <ProjectItem
                  key={project.id}
                  project={project}
                  workspaceId={workspaceId}
                  isActive={isActive}
                  defaultExpanded={isActive}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Settings section - Only show when expanded */}
      <div className="pt-2 border-t border-sidebar-border mt-2">
        <div className="px-3 py-2 flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <Link
            to={`/workspaces/${workspaceId}/settings`}
            className={cn(
              "flex-1 text-xs font-semibold uppercase tracking-wide transition-colors",
              location.pathname.includes("/settings")
                ? "text-primary"
                : "text-muted-foreground hover:text-sidebar-foreground"
            )}
          >
            Cài đặt
          </Link>
        </div>
      </div>
    </nav>
  )
}
