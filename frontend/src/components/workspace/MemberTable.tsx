import { LoaderCircle, Mail, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import UpdateRoleDialog from "@/components/workspace/UpdateRoleDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useRemoveWorkspaceMemberMutation } from "@/hooks/useWorkspaces"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import { getWorkspaceRoleLabel, workspaceRoleVariantMap } from "@/lib/workspace-role"
import type { WorkspaceMember } from "@/types/workspace"

interface MemberTableProps {
  workspaceId: number
  members: WorkspaceMember[]
  isLoading: boolean
  currentUserId: number | null
  canManage: boolean
  membersPage: number
  membersLimit: number
}

export default function MemberTable({
  workspaceId,
  members,
  isLoading,
  currentUserId,
  canManage,
  membersPage,
  membersLimit,
}: MemberTableProps) {
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Thành viên</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead>Ngày tham gia</TableHead>
            {canManage ? <TableHead className="text-right">Hành động</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-16 rounded-md" />
                        <Skeleton className="h-8 w-16 rounded-md" />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            : null}

          {!isLoading && members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canManage ? 4 : 3} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-sm font-medium text-foreground">Workspace này chưa có thành viên nào.</p>
                  <p className="text-sm text-muted-foreground">
                    Khi có người tham gia, danh sách và vai trò sẽ hiển thị tại đây.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : null}

          {!isLoading
            ? members.map((member) => {
                const isSelf = currentUserId === member.user.id
                const canChangeRole = canManage && member.role !== "OWNER" && !isSelf
                const canRemove = canManage && member.role !== "OWNER" && !isSelf

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {member.user.avatar ? (
                            <AvatarImage src={member.user.avatar} alt={member.user.name ?? member.user.email} />
                          ) : null}
                          <AvatarFallback>
                            {(member.user.name || member.user.email).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {member.user.name || "Chưa cập nhật tên"}
                            </span>
                            {isSelf ? <Badge variant="outline">Bạn</Badge> : null}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{member.user.email}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={workspaceRoleVariantMap[member.role]}>
                        {getWorkspaceRoleLabel(member.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString("vi-VN")}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canChangeRole ? (
                            <UpdateRoleDialog
                              workspaceId={workspaceId}
                              member={member}
                              membersPage={membersPage}
                              membersLimit={membersLimit}
                            />
                          ) : (
                            <Button variant="ghost" size="sm" disabled>
                              <span className="sr-only">Không thể đổi vai trò</span>
                            </Button>
                          )}

                          {canRemove ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={removeMemberMutation.isPending}
                              onClick={() => void handleRemoveMember(member)}
                            >
                              {removeMemberMutation.isPending ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled>
                              <span className="sr-only">Không thể xóa</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })
            : null}
        </TableBody>
      </Table>
    </div>
  )
}
