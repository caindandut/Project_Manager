import { Link, useParams } from "react-router-dom"
import {
  ChevronDown,
  Plus,
  Settings,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
          className="flex h-9 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-[#EBECF0]"
        >
          {currentWorkspaceQuery.isLoading ? (
            <Skeleton className="h-8 w-8 rounded" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0052CC] text-white text-sm font-semibold">
              {currentWorkspace ? getInitials(currentWorkspace.name) : "?"}
            </div>
          )}

          <span className={cn(
            "max-w-[180px] truncate text-[#172B4D]",
            !currentWorkspace && "text-muted-foreground"
          )}>
            {currentWorkspace?.name || "Chọn workspace"}
          </span>

          <ChevronDown className="h-4 w-4 text-[#5E6C84]" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72">
        {/* Current workspace info */}
        {currentWorkspace && (
          <>
            <div className="px-3 py-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 rounded">
                  <AvatarFallback className="rounded bg-[#0052CC] text-white text-sm font-semibold">
                    {getInitials(currentWorkspace.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#172B4D] truncate">{currentWorkspace.name}</p>
                  <p className="text-xs text-[#5E6C84] mt-0.5">
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
          <p className="px-2 py-1.5 text-xs font-semibold text-[#5E6C84] uppercase tracking-wide">
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
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-[#DFE1E6] text-[#172B4D] text-xs font-semibold">
                      {getInitials(ws.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#172B4D] truncate">{ws.name}</p>
                      <p className="text-xs text-[#5E6C84]">
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
            className="flex items-center gap-3 cursor-pointer rounded-md mx-1 text-[#0052CC]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded border-2 border-dashed border-[#0052CC]/30 bg-[#DEEBFF]">
              <Plus className="h-4 w-4 text-[#0052CC]" />
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
                <Settings className="h-4 w-4 text-[#5E6C84]" />
                <span className="text-sm text-[#172B4D]">Cài đặt workspace</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
