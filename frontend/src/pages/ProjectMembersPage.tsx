import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Users, Shield, ShieldCheck, User, UserMinus } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

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
import { useProjectDetailQuery } from "@/hooks/useProject"
import { useWorkspaceDetailQuery } from "@/hooks/useWorkspaces"
import { useAuth } from "@/hooks/useAuth"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import type { ProjectMember, ProjectRole } from "@/lib/project-member-api"

// ============================================================
// Role helpers
// ============================================================

const ROLE_CONFIG: Record<ProjectRole, { label: string; variant: "default" | "secondary" | "outline"; icon: typeof Shield }> = {
  ADMIN: { label: "Admin", variant: "default", icon: ShieldCheck },
  MEMBER: { label: "Thành viên", variant: "secondary", icon: Shield },
  GUEST: { label: "Khách", variant: "outline", icon: User },
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Đang chờ", variant: "outline" },
  ACCEPTED: { label: "Đã tham gia", variant: "default" },
  DECLINED: { label: "Từ chối", variant: "destructive" },
}

export default function ProjectMembersPage() {
  const params = useParams<{ workspaceId: string; projectId: string }>()
  const workspaceSlug = params.workspaceId || ""
  const projectId = Number(params.projectId || "0")

  const workspaceQuery = useWorkspaceDetailQuery(workspaceSlug)
  const projectQuery = useProjectDetailQuery(workspaceSlug, projectId)
  const membersQuery = useProjectMembersQuery(projectId)
  const { user } = useAuth()

  const updateRoleMutation = useUpdateProjectMemberRoleMutation(projectId)
  const removeMutation = useRemoveProjectMemberMutation(projectId)

  const [removingMember, setRemovingMember] = useState<ProjectMember | null>(null)

  const project = projectQuery.data
  const members = membersQuery.data?.data ?? []

  useEffect(() => {
    document.title = project
      ? `${project.name} | Thành viên`
      : "Thành viên | Project Manager"
  }, [project])

  const currentProjectMember = members.find((member) => member.user.id === user?.id)
  const canManage = currentProjectMember?.role === "ADMIN" && currentProjectMember.status === "ACCEPTED"

  const handleChangeRole = (memberId: number, newRole: "MEMBER" | "GUEST") => {
    updateRoleMutation.mutate({ memberId, payload: { role: newRole } })
  }

  const handleRemove = () => {
    if (!removingMember) return
    removeMutation.mutate(removingMember.id, {
      onSuccess: () => {
        setRemovingMember(null)
        toast.success("Đã xóa thành viên khỏi dự án")
      },
      onError: (error: unknown) => {
        toast.error(toVietnameseErrorMessage(error, "Không thể xóa thành viên khỏi dự án."))
        setRemovingMember(null)
      }
    })
  }

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          to={`/workspaces/${workspaceSlug}`}
          className="hover:text-foreground transition-colors"
        >
          {workspaceQuery.data?.name || "Workspace"}
        </Link>
        <span>/</span>
        <Link
          to={`/workspaces/${workspaceSlug}/projects/${projectId}/overview`}
          className="hover:text-foreground transition-colors"
        >
          {project?.name || "Dự án"}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Thành viên</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Thành viên dự án</h1>
            <p className="text-sm text-muted-foreground">
              Quản lý các thành viên và lời mời tham gia dự án.
            </p>
          </div>
        </div>
        <Link to={`/workspaces/${workspaceSlug}/projects/${projectId}/overview`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
        </Link>
      </div>

      {/* Members List */}
      <div className="rounded-md border bg-card text-card-foreground">
        {/* Table Header */}
        <div className="grid grid-cols-12 items-center gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground">
          <div className="col-span-5">Thành viên</div>
          <div className="col-span-2">Vai trò</div>
          <div className="col-span-2">Trạng thái</div>
          <div className="col-span-2 text-right">Ngày tham gia</div>
          <div className="col-span-1"></div>
        </div>

        {/* Table Body */}
        {membersQuery.isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p>Chưa có thành viên nào.</p>
          </div>
        ) : (
          <div className="divide-y">
            {members.map((member: ProjectMember) => {
              const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.MEMBER
              const RoleIcon = roleConfig.icon
              const statusConfig = STATUS_CONFIG[member.status] || STATUS_CONFIG.PENDING
              const isAdmin = member.role === "ADMIN"
              
              const initials = member.user.name
                ? member.user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
                : member.user.email[0].toUpperCase()

              return (
                <div key={member.id} className="grid grid-cols-12 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
                  {/* User Info */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={member.user.avatar || undefined} alt={member.user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">{member.user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="col-span-2">
                    <Badge variant={roleConfig.variant} className="gap-1.5 font-normal">
                      <RoleIcon className="h-3 w-3" />
                      {roleConfig.label}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <Badge variant={statusConfig.variant} className="font-normal">
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Join Date */}
                  <div className="col-span-2 text-right text-sm text-muted-foreground">
                    {format(new Date(member.joinedAt), "dd/MM/yyyy", { locale: vi })}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end">
                    {canManage && !isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4 rotate-180" /> {/* temporary More icon since we don't have MoreHorizontal explicitly imported */}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role !== "MEMBER" && (
                            <DropdownMenuItem onClick={() => handleChangeRole(member.id, "MEMBER")}>
                              Đổi thành Thành viên
                            </DropdownMenuItem>
                          )}
                          {member.role !== "GUEST" && (
                            <DropdownMenuItem onClick={() => handleChangeRole(member.id, "GUEST")}>
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
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa khỏi dự án?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa thành viên <span className="font-medium text-foreground">{removingMember?.user.name}</span> khỏi dự án này không?
              Thành viên này sẽ không thể nhìn thấy dự án nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              Xóa thành viên
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
