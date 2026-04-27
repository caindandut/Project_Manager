import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ChevronDown,
  ChevronRight,
  Copy,
  LogOut,
  Plus,
  Settings,
  UserPlus,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useWorkspaceDetailQuery, useWorkspacesQuery } from "@/hooks/useWorkspaces"
import { cn } from "@/lib/utils"
import { getWorkspaceRoleLabel, workspaceRoleVariantMap } from "@/lib/workspace-role"
import InviteMemberDialog from "@/components/workspace/InviteMemberDialog"

const WORKSPACES_PER_PAGE = 20

export default function WorkspaceDropdown() {
  const { user } = useAuth()
  const params = useParams()
  const navigate = useNavigate()
  const workspaceId = Number(params.workspaceId || "0")

  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const workspacesQuery = useWorkspacesQuery(1, WORKSPACES_PER_PAGE)
  const currentWorkspaceQuery = useWorkspaceDetailQuery(workspaceId)

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

  const handleCopyInviteLink = async () => {
    const inviteLink = `${window.location.origin}/invite/${workspaceId}`
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast.success("Đã sao chép liên kết mời!")
    } catch {
      toast.error("Không thể sao chép liên kết")
    }
  }

  const handleLogout = () => {
    navigate("/login")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            {currentWorkspaceQuery.isLoading ? (
              <Skeleton className="h-8 w-8 rounded-md" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
                {currentWorkspace ? getInitials(currentWorkspace.name) : "?"}
              </div>
            )}

            <span className={cn(
              "max-w-[150px] truncate",
              !currentWorkspace && "text-muted-foreground"
            )}>
              {currentWorkspace?.name || "Chọn workspace"}
            </span>

            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-80">
          {currentWorkspace && (
            <>
              <DropdownMenuLabel className="font-normal p-0">
                <div className="px-3 py-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-lg font-bold">
                        {getInitials(currentWorkspace.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate">{currentWorkspace.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={workspaceRoleVariantMap[currentWorkspace.role]} className="text-xs">
                          {getWorkspaceRoleLabel(currentWorkspace.role)}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {currentWorkspace.stats?.memberCount || 0} thành viên
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}

          {workspacesQuery.isLoading ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="p-1">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Workspace khác
              </p>
              {workspaces
                .filter((ws) => ws.id !== workspaceId)
                .map((ws) => (
                  <DropdownMenuItem key={ws.id} asChild>
                    <Link
                      to={`/workspaces/${ws.id}`}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-sm font-bold">
                        {getInitials(ws.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{ws.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ws.memberCount} thành viên
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
            </div>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link to="/workspaces" className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Tạo workspace mới
            </Link>
          </DropdownMenuItem>

          {currentWorkspace && (
            <>
              <DropdownMenuSeparator />
              <div className="p-1">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Quản lý workspace
                </p>
                <DropdownMenuItem asChild>
                  <Link to={`/workspaces/${workspaceId}/settings`} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Cài đặt
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowInviteDialog(true)} className="cursor-pointer">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Mời thành viên
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyInviteLink} className="cursor-pointer">
                  <Copy className="mr-2 h-4 w-4" />
                  Sao chép liên kết mời
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showInviteDialog && workspaceId > 0 && (
        <InviteMemberDialog
          workspaceId={workspaceId}
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
        />
      )}
    </>
  )
}
