import { useState } from "react"
import { MoreHorizontal, Shield, ShieldCheck, User, UserMinus } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useProjectMembersQuery,
  useUpdateProjectMemberRoleMutation,
  useRemoveProjectMemberMutation,
} from "@/hooks/useProjectMembers"
import type { ProjectMember, ProjectRole } from "@/lib/project-member-api"

// ============================================================
// Role helpers
// ============================================================

const ROLE_CONFIG: Record<ProjectRole, { label: string; variant: "default" | "secondary" | "outline"; icon: typeof Shield }> = {
  ADMIN: { label: "Admin", variant: "default", icon: ShieldCheck },
  MEMBER: { label: "Thành viên", variant: "secondary", icon: Shield },
  GUEST: { label: "Khách", variant: "outline", icon: User },
}

// ============================================================
// Props
// ============================================================

interface ProjectMemberListProps {
  projectId: number
  /** Whether the current user can manage members (workspace admin or project admin) */
  canManage: boolean
}

// ============================================================
// Component
// ============================================================

export default function ProjectMemberList({ projectId, canManage }: ProjectMemberListProps) {
  const membersQuery = useProjectMembersQuery(projectId)
  const updateRoleMutation = useUpdateProjectMemberRoleMutation(projectId)
  const removeMutation = useRemoveProjectMemberMutation(projectId)

  const [removingMember, setRemovingMember] = useState<ProjectMember | null>(null)

  const members = membersQuery.data?.data ?? []

  const handleChangeRole = (memberId: number, newRole: "MEMBER" | "GUEST") => {
    updateRoleMutation.mutate({ memberId, payload: { role: newRole } })
  }

  const handleRemove = () => {
    if (!removingMember) return
    removeMutation.mutate(removingMember.id, {
      onSuccess: () => setRemovingMember(null),
    })
  }

  // Loading
  if (membersQuery.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  // Empty
  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Chưa có thành viên nào
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="divide-y divide-border rounded-lg border">
        {members.map((member) => {
          const roleConfig = ROLE_CONFIG[member.role]
          const RoleIcon = roleConfig.icon
          const isAdmin = member.role === "ADMIN"
          const initials = member.user.name
            ? member.user.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : member.user.email[0].toUpperCase()

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
            >
              {/* Avatar */}
              <Avatar className="h-10 w-10 border">
                {member.user.avatar && <AvatarImage src={member.user.avatar} alt={member.user.name} />}
                <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{member.user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
              </div>

              {/* Role Badge */}
              <Badge variant={roleConfig.variant} className="gap-1.5">
                <RoleIcon className="h-3 w-3" />
                {roleConfig.label}
              </Badge>

              {/* Actions */}
              {canManage && !isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Thao tác</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {member.role !== "MEMBER" && (
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, "MEMBER")}>
                        <Shield className="mr-2 h-4 w-4" />
                        Đổi thành Thành viên
                      </DropdownMenuItem>
                    )}
                    {member.role !== "GUEST" && (
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, "GUEST")}>
                        <User className="mr-2 h-4 w-4" />
                        Đổi thành Khách
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setRemovingMember(member)}
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Xóa khỏi dự án
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}
      </div>

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa{" "}
              <span className="font-medium text-foreground">
                {removingMember?.user.name || removingMember?.user.email}
              </span>{" "}
              khỏi dự án? Hành động này có thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
