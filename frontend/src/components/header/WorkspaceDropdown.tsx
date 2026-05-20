import { Link, useParams } from "react-router-dom"
import {
  ChevronDown,
  Plus,
  Settings,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useWorkspaceDetailQuery, useWorkspacesQuery } from "@/hooks/useWorkspaces"
import { cn } from "@/lib/utils"

const WORKSPACES_PER_PAGE = 20

export default function WorkspaceDropdown() {
  const params = useParams()
  const workspaceSlug = params.workspaceId || ""

  const workspacesQuery = useWorkspacesQuery(1, WORKSPACES_PER_PAGE)
  const currentWorkspaceQuery = useWorkspaceDetailQuery(workspaceSlug)

  const workspaces = workspacesQuery.data?.data ?? []
  const currentWorkspace = currentWorkspaceQuery.data

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          {currentWorkspaceQuery.isLoading ? (
            <Skeleton className="h-8 w-8 rounded-lg" />
          ) : (
            <Avatar className="h-8 w-8 rounded-lg">
              {currentWorkspace?.logo && (
                <AvatarImage src={currentWorkspace.logo} alt={currentWorkspace.name} />
              )}
              <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                {currentWorkspace ? getInitials(currentWorkspace.name) : "?"}
              </AvatarFallback>
            </Avatar>
          )}

          <span className={cn(
            "max-w-[180px] truncate text-foreground",
            !currentWorkspace && "text-muted-foreground"
          )}>
            {currentWorkspace?.name || "Chọn workspace"}
          </span>

          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72">
        {/* Current workspace info */}
        {currentWorkspace && (
          <>
            <div className="px-3 py-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 rounded-lg">
                  {currentWorkspace.logo && (
                    <AvatarImage src={currentWorkspace.logo} alt={currentWorkspace.name} />
                  )}
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                    {getInitials(currentWorkspace.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{currentWorkspace.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {currentWorkspace.stats?.projectCount || 0} dự án
                  </p>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Workspace list */}
        <div className="p-1">
          <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Các workspace khác
          </p>
          {workspacesQuery.isLoading ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            workspaces
              .filter((ws) => ws.slug !== workspaceSlug)
              .map((ws) => (
                <DropdownMenuItem key={ws.id} asChild>
                  <Link
                    to={`/workspaces/${ws.slug}`}
                    className="flex items-center gap-3 cursor-pointer rounded-md mx-1"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      {ws.logo && (
                        <AvatarImage src={ws.logo} alt={ws.name} />
                      )}
                      <AvatarFallback className="rounded-lg bg-muted text-foreground text-xs font-semibold">
                        {getInitials(ws.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{ws.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ws.projectCount} dự án
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Create workspace */}
        <DropdownMenuItem asChild>
          <Link
            to="/workspaces/create"
            className="flex items-center gap-3 cursor-pointer rounded-md mx-1 text-primary"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded border-2 border-dashed border-primary/30 bg-primary/10">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <span className="font-medium text-sm">Tạo workspace mới</span>
          </Link>
        </DropdownMenuItem>

        {/* Settings */}
        {currentWorkspace && workspaceSlug && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                to={`/workspaces/${workspaceSlug}/settings`}
                className="flex items-center gap-3 cursor-pointer rounded-md mx-1"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Cài đặt workspace</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
