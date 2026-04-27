import { useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Circle,
  Folder,
  FolderKanban,
  Home,
  LayoutDashboard,
  LayoutGrid,
  List,
  TrendingUp,
} from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useWorkspacesQuery } from "@/hooks/useWorkspaces"
import { useProjectsQuery } from "@/hooks/useProjects"
import { cn } from "@/lib/utils"

interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  isActive?: boolean
  isCollapsed?: boolean
  indent?: boolean
}

export function SidebarItem({
  icon: Icon,
  label,
  href,
  isActive,
  isCollapsed,
  indent,
}: SidebarItemProps) {
  const content = (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-[#172B4D] hover:bg-[#EBECF0]",
        indent && "ml-6",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", isCollapsed && "h-5 w-5")} />
      {!isCollapsed && <span className="truncate">{label}</span>}
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

interface ProjectViewItemProps {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
  isCollapsed?: boolean
}

function ProjectViewItem({ label, href, icon: Icon, isActive, isCollapsed }: ProjectViewItemProps) {
  const content = (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
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

interface WorkspaceItemProps {
  workspace: {
    id: number
    name: string
    slug?: string
  }
  isActive: boolean
  isCollapsed: boolean
  isExpanded: boolean
  onToggle: () => void
}

function WorkspaceItem({ workspace, isActive, isCollapsed, isExpanded, onToggle }: WorkspaceItemProps) {
  const location = useLocation()
  const basePath = `/workspaces/${workspace.id}`
  const projectsQuery = useProjectsQuery(workspace.id)
  const projects = projectsQuery.data?.data ?? []

  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(() => new Set())

  const toggleProject = (id: number) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            to={basePath}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-[#DFE1E6] text-[#172B4D] hover:bg-[#EBECF0]"
            )}
          >
            {getInitials(workspace.name)}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-normal">
          {workspace.name}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <Link
          to={basePath}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-colors shrink-0",
            isActive
              ? "bg-primary text-primary-foreground"
              : "bg-[#DFE1E6] text-[#172B4D] hover:bg-[#EBECF0]"
          )}
        >
          {getInitials(workspace.name)}
        </Link>
        <Link
          to={basePath}
          className={cn(
            "flex-1 truncate text-sm font-medium transition-colors",
            isActive ? "text-primary" : "text-[#172B4D] hover:text-[#172B4D]",
            !isActive && "text-muted-foreground"
          )}
        >
          {workspace.name}
        </Link>
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-[#EBECF0] transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {isExpanded && !isCollapsed && (
        <div className="ml-6 space-y-0.5 mt-1">
          <SidebarItem
            icon={Home}
            label="Trang chủ"
            href={basePath}
            isActive={location.pathname === basePath}
          />
          <SidebarItem
            icon={LayoutDashboard}
            label="Công việc của tôi"
            href={`${basePath}/my-tasks`}
            isActive={location.pathname === `${basePath}/my-tasks`}
          />
          <div className="space-y-0.5">
            <SidebarItem
              icon={Folder}
              label="Dự án"
              href={`${basePath}/projects`}
              isActive={location.pathname.startsWith(`${basePath}/projects`)}
              indent={false}
            />
            
            {/* Projects list */}
            {projectsQuery.isLoading ? (
              <div className="ml-4 space-y-1">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="ml-4 space-y-0.5">
                {projects.map((project) => {
                  const projectPath = `${basePath}/projects/${project.id}`
                  const isProjectActive = location.pathname.startsWith(projectPath)
                  const isProjectExpanded = expandedProjects.has(project.id)

                  return (
                    <div key={project.id}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleProject(project.id)}
                          className="flex-1 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-[#EBECF0]"
                        >
                          <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className={cn(
                            "truncate flex-1 text-left",
                            isProjectActive ? "text-primary font-medium" : "text-foreground"
                          )}>
                            {project.name}
                          </span>
                        </button>
                        <button
                          onClick={() => toggleProject(project.id)}
                          className="p-0.5 rounded hover:bg-[#EBECF0]"
                        >
                          {isProjectExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>

                      {isProjectExpanded && (
                        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
                          <ProjectViewItem
                            label="Danh sách"
                            href={`${projectPath}/list`}
                            icon={List}
                            isActive={location.pathname === `${projectPath}/list`}
                          />
                          <ProjectViewItem
                            label="Kanban"
                            href={`${projectPath}/kanban`}
                            icon={LayoutGrid}
                            isActive={location.pathname === `${projectPath}/kanban`}
                          />
                          <ProjectViewItem
                            label="Gantt"
                            href={`${projectPath}/gantt`}
                            icon={TrendingUp}
                            isActive={location.pathname === `${projectPath}/gantt`}
                          />
                          <ProjectViewItem
                            label="Lịch"
                            href={`${projectPath}/calendar`}
                            icon={Calendar}
                            isActive={location.pathname === `${projectPath}/calendar`}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ProjectNavigatorProps {
  isCollapsed: boolean
}

export function ProjectNavigator({ isCollapsed }: ProjectNavigatorProps) {
  const params = useParams()
  const location = useLocation()
  const workspaceId = Number(params.workspaceId || "0")

  const workspacesQuery = useWorkspacesQuery(1, 20)

  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<number>>(() => {
    const initial = new Set<number>()
    if (workspaceId > 0) {
      initial.add(workspaceId)
    }
    return initial
  })

  const toggleWorkspace = (id: number) => {
    setExpandedWorkspaces((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (isCollapsed) {
    return (
      <div className="space-y-2">
        {workspacesQuery.data?.data.map((ws) => (
          <WorkspaceItem
            key={ws.id}
            workspace={ws}
            isActive={ws.id === workspaceId}
            isCollapsed={isCollapsed}
            isExpanded={expandedWorkspaces.has(ws.id)}
            onToggle={() => toggleWorkspace(ws.id)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-3">
        <FolderKanban className="h-4 w-4 text-[#172B4D]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[#172B4D]">
          Dự án
        </span>
      </div>

      {/* Workspace List */}
      <div className="space-y-3">
        {workspacesQuery.isLoading ? (
          <div className="space-y-2 px-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          workspacesQuery.data?.data.map((ws) => (
            <WorkspaceItem
              key={ws.id}
              workspace={ws}
              isActive={ws.id === workspaceId}
              isCollapsed={isCollapsed}
              isExpanded={expandedWorkspaces.has(ws.id)}
              onToggle={() => toggleWorkspace(ws.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
