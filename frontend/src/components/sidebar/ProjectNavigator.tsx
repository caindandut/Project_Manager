import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Folder,
  Home,
  LayoutDashboard,
  List,
  Plus,
  Settings,
  Users,
} from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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

function CollapsedTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="rounded-md border border-white/10 bg-zinc-950 px-2 py-1 text-xs font-medium text-white shadow-lg"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function SectionTitle({ children, isCollapsed }: { children?: React.ReactNode; isCollapsed?: boolean }) {
  if (isCollapsed) {
    return <div className="my-2 h-px bg-sidebar-border" />
  }

  return (
    <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  )
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
    const link = (
      <Link
        to={hasChildren ? "#" : href}
        onClick={handleClick}
        className={cn(
          "flex items-center justify-center rounded-md py-2 transition-colors cursor-pointer",
          isActive ? "bg-primary/20 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"
        )}
        aria-label={label}
      >
        <Icon className="h-4 w-4 shrink-0" />
      </Link>
    )

    return <CollapsedTooltip label={label}>{link}</CollapsedTooltip>
  }

  const content = (
    <Link
      to={hasChildren ? "#" : href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
        isActive ? "bg-primary/20 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent",
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
        {expanded && <div className="mt-1 space-y-0.5">{children}</div>}
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
    const link = (
      <Link
        to={href}
        className={cn(
          "flex items-center justify-center rounded-md py-1.5 transition-colors",
          isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-sidebar-accent"
        )}
        aria-label={label}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </Link>
    )

    return <CollapsedTooltip label={label}>{link}</CollapsedTooltip>
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
    { label: "Danh sách công việc", href: `${projectPath}/kanban`, icon: List },
  ]

  if (isCollapsed) {
    return (
      <div className="space-y-1">
        <CollapsedTooltip label={project.name}>
          <Link
            to={projectPath}
            className={cn(
              "flex items-center justify-center rounded-md py-2 transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent"
            )}
            aria-label={project.name}
          >
            <Folder className="h-4 w-4 shrink-0" />
          </Link>
        </CollapsedTooltip>
        {isExpanded && (
          <div className="space-y-0.5">
            {viewItems.map((item) => {
              const active = item.href.endsWith("/kanban")
                ? location.pathname.includes(`/projects/${project.id}/`) && !location.pathname.endsWith("/overview") && !location.pathname.endsWith("/settings")
                : location.pathname === item.href
              return (
                <ProjectViewItem
                  key={item.href}
                  label={item.label}
                  href={item.href}
                  icon={item.icon}
                  isActive={active}
                  isCollapsed={true}
                />
              )
            })}
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
          {viewItems.map((item) => {
            const active = item.href.endsWith("/kanban")
              ? location.pathname.includes(`/projects/${project.id}/`) && !location.pathname.endsWith("/overview") && !location.pathname.endsWith("/settings")
              : location.pathname === item.href
            return (
              <ProjectViewItem
                key={item.href}
                label={item.label}
                href={item.href}
                icon={item.icon}
                isActive={active}
              />
            )
          })}
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
        <SectionTitle isCollapsed />
        <SidebarItem
          icon={Home}
          label="Tổng quan"
          href={basePath}
          isActive={location.pathname === basePath && !isInProject}
          isCollapsed={true}
        />
        <SidebarItem
          icon={CheckSquare}
          label="Công việc của tôi"
          href={`${basePath}/my-tasks`}
          isActive={location.pathname === `${basePath}/my-tasks`}
          isCollapsed={true}
        />
        <SidebarItem
          icon={Folder}
          label="Dự án"
          href={`${basePath}/projects`}
          isActive={location.pathname === `${basePath}/projects`}
          isCollapsed={true}
        />

        <SectionTitle isCollapsed />
        <SidebarItem
          icon={Users}
          label="Thành viên"
          href={`${basePath}/members`}
          isActive={location.pathname === `${basePath}/members`}
          isCollapsed={true}
        />
        <SidebarItem
          icon={Settings}
          label="Cài đặt workspace"
          href={`${basePath}/settings`}
          isActive={location.pathname.includes("/settings")}
          isCollapsed={true}
        />
      </nav>
    )
  }

  return (
    <nav className="space-y-1">
      <SectionTitle>Dự án</SectionTitle>
      <SidebarItem
        icon={Home}
        label="Tổng quan"
        href={basePath}
        isActive={location.pathname === basePath && !isInProject}
      />
      <SidebarItem
        icon={CheckSquare}
        label="Công việc của tôi"
        href={`${basePath}/my-tasks`}
        isActive={location.pathname === `${basePath}/my-tasks`}
      />
      <SidebarItem
        icon={Folder}
        label="Dự án"
        href={`${basePath}/projects`}
        isActive={location.pathname === `${basePath}/projects`}
      />

      <div className="pt-1">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Danh sách project
          </span>
          <Link
            to={`/workspaces/${workspaceId}/projects/new`}
            className="flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-primary"
            title="Tạo dự án"
          >
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>

        {projectsQuery.isLoading ? (
          <div className="space-y-1 px-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="mb-2 text-xs text-muted-foreground">Chưa có dự án nào</p>
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

      <div className="mt-2 border-t border-sidebar-border pt-1">
        <SectionTitle>Cài đặt</SectionTitle>
        <SidebarItem
          icon={Users}
          label="Thành viên"
          href={`${basePath}/members`}
          isActive={location.pathname === `${basePath}/members`}
        />
        <SidebarItem
          icon={Settings}
          label="Cài đặt workspace"
          href={`${basePath}/settings`}
          isActive={location.pathname.includes("/settings")}
        />
      </div>
    </nav>
  )
}
