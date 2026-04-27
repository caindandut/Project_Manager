import { NavLink } from "react-router-dom"
import { FolderKanban, LayoutDashboard, Users } from "lucide-react"

import InviteMemberDialog from "@/components/workspace/InviteMemberDialog"
import InvitationList from "@/components/workspace/InvitationList"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type {
  PendingInvitation,
  WorkspaceDetail,
  WorkspaceMember,
} from "@/types/workspace"

interface WorkspaceLayoutProps {
  workspace: WorkspaceDetail | undefined
  members: WorkspaceMember[]
  membersLoading: boolean
  invitations: PendingInvitation[]
  invitationsLoading: boolean
  canManage: boolean
  workspaceId: string | number
  children: React.ReactNode
}

const navItems = [
  { to: "", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "projects", label: "Dự án", icon: FolderKanban },
  { to: "members", label: "Thành viên", icon: Users },
]

export default function WorkspaceLayout({
  workspace,
  members,
  membersLoading,
  invitations,
  invitationsLoading,
  canManage,
  workspaceId,
  children,
}: WorkspaceLayoutProps) {
  const topMembers = members.slice(0, 5)

  return (
    <div className="flex h-full gap-6">
      {/* Left Sidebar - Workspace Info & Navigation */}
      <aside className="w-64 flex-shrink-0 space-y-4">
        {/* Workspace Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {workspace?.logo ? (
                <img
                  src={workspace.logo}
                  alt={workspace.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-semibold text-primary">
                  {workspace?.name?.charAt(0).toUpperCase() || "W"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold">{workspace?.name || "Workspace"}</h2>
                <p className="truncate text-sm text-muted-foreground">
                  {workspace?.description || "Không gian làm việc"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardContent className="p-2">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to ? `/workspaces/${workspaceId}/${item.to}` : `/workspaces/${workspaceId}`}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Invite Button */}
        {canManage ? (
          <InviteMemberDialog workspaceId={workspaceId} membersPage={1} membersLimit={50} />
        ) : null}
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1">{children}</main>

      {/* Right Sidebar - Stats & Info */}
      <aside className="w-72 flex-shrink-0 space-y-4">
        {/* Stats */}
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Thống kê</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-2xl font-bold">{workspace?.stats.memberCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Thành viên</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{workspace?.stats.projectCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Dự án</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{workspace?.stats.taskCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Công việc</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Members */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Thành viên nổi bật</h3>
              {members.length > 5 ? (
                <NavLink
                  to={`/workspaces/${workspaceId}/members`}
                  className="text-xs text-primary hover:underline"
                >
                  Xem tất cả
                </NavLink>
              ) : null}
            </div>

            {membersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có thành viên nào.</p>
            ) : (
              <div className="space-y-3">
                {topMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {member.user.avatar ? (
                        <AvatarImage src={member.user.avatar} alt={member.user.name ?? member.user.email} />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {(member.user.name || member.user.email).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member.user.name || "Chưa cập nhật tên"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        <Card>
          <CardContent className="p-4">
            <InvitationList
              workspaceId={workspaceId}
              invitations={invitations}
              isLoading={invitationsLoading}
              canManage={canManage}
            />
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
