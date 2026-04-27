import { LoaderCircle, Mail, Trash2 } from "lucide-react"
import { toast } from "sonner"

import UpdateRoleDialog from "@/components/workspace/UpdateRoleDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useRemoveWorkspaceMemberMutation } from "@/hooks/useWorkspaces"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import { getWorkspaceRoleLabel, workspaceRoleVariantMap } from "@/lib/workspace-role"
import type { WorkspaceMember } from "@/types/workspace"

interface MemberListProps {
  workspaceId: number
  members: WorkspaceMember[]
  isLoading: boolean
  currentUserId: number | null
  canManage: boolean
  membersPage: number
  membersLimit: number
}

export default function MemberList({
  workspaceId,
  members,
  isLoading,
  currentUserId,
  canManage,
  membersPage,
  membersLimit,
}: MemberListProps) {
  const removeMemberMutation = useRemoveWorkspaceMemberMutation(workspaceId, membersPage, membersLimit)

  const handleRemoveMember = async (member: WorkspaceMember) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa ${member.user.name || member.user.email} khỏi workspace này không?`,
    )

    if (!confirmed) {
      return
    }

    try {
      await removeMemberMutation.mutateAsync(member.id)
      toast.success("Đã xóa thành viên khỏi workspace.")
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, "Không thể xóa thành viên này."))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thành viên workspace</CardTitle>
        <CardDescription>
          Theo dõi vai trò, thông tin liên hệ và quyền cộng tác của từng người trong không gian này.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 rounded-md border border-border/80 bg-muted/20 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
            ))
          : null}

        {!isLoading && members.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/80 bg-muted/30 px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">Workspace này chưa có thành viên nào.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Khi có người tham gia, danh sách và vai trò sẽ hiển thị tại đây.
            </p>
          </div>
        ) : null}

        {!isLoading
          ? members.map((member) => {
              const isSelf = currentUserId === member.user.id
              const canChangeRole = canManage && member.role !== "OWNER" && !isSelf
              const canRemove = canManage && member.role !== "OWNER" && !isSelf

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 rounded-md border border-border/80 bg-muted/15 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <Avatar size="lg">
                      {member.user.avatar ? (
                        <AvatarImage src={member.user.avatar} alt={member.user.name ?? member.user.email} />
                      ) : null}
                      <AvatarFallback>
                        {(member.user.name || member.user.email).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{member.user.name || "Chưa cập nhật tên"}</p>
                        <Badge variant={workspaceRoleVariantMap[member.role]}>
                          {getWorkspaceRoleLabel(member.role)}
                        </Badge>
                        {isSelf ? <Badge variant="outline">Bạn</Badge> : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{member.user.email}</span>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Tham gia từ {new Date(member.joinedAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canChangeRole ? (
                      <UpdateRoleDialog
                        workspaceId={workspaceId}
                        member={member}
                        membersPage={membersPage}
                        membersLimit={membersLimit}
                      />
                    ) : null}

                    {canRemove ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={removeMemberMutation.isPending}
                        onClick={() => void handleRemoveMember(member)}
                      >
                        {removeMemberMutation.isPending ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span>Xóa</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            })
          : null}
      </CardContent>
    </Card>
  )
}
