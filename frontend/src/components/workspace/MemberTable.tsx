import { LoaderCircle, Mail, Trash2 } from "lucide-react"
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
import { workspaceRoleVariantMap } from "@/lib/workspace-role"
import type { WorkspaceMember } from "@/types/workspace"

interface MemberTableProps {
  workspaceId: string | number
  members: WorkspaceMember[]
  isLoading: boolean
  currentUserId: number | null
  canManage: boolean
  membersPage: number
  membersLimit: number
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function splitName(fullName: string | null): { firstName: string; lastName: string } {
  if (!fullName) {
    return { firstName: "", lastName: "" }
  }
  const parts = fullName.trim().split(/\s+/)
  const firstName = parts[0] || ""
  const lastName = parts.slice(1).join(" ") || ""
  return { firstName, lastName }
}

function getDisplayRole(role: string): string {
  if (role === "OWNER" || role === "ADMIN") return "Admin"
  if (role === "MEMBER") return "Member"
  if (role === "GUEST") return "Guest"
  return role
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
            <TableHead>Họ và tên</TableHead>
            <TableHead>Tên hiển thị</TableHead>
            <TableHead>Email</TableHead>
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
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  {canManage ? <TableCell><Skeleton className="ml-auto h-8 w-20" /></TableCell> : null}
                </TableRow>
              ))
            : null}

          {!isLoading && members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canManage ? 6 : 5} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-sm font-medium text-foreground">Không có thành viên nào.</p>
                  <p className="text-sm text-muted-foreground">
                    Mời thành viên để bắt đầu cộng tác.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : null}

          {!isLoading
            ? members.map((member) => {
                const isSelf = currentUserId === member.user.id
                const { firstName, lastName } = splitName(member.user.name)
                const displayName = member.user.name || member.user.email || "Chưa cập nhật"
                const canChangeRole = canManage && member.role !== "OWNER" && !isSelf
                const canRemove = canManage && member.role !== "OWNER" && !isSelf
                const badgeVariant = workspaceRoleVariantMap[member.role] || "secondary"
                const displayRole = getDisplayRole(member.role)

                return (
                  <TableRow key={member.id}>
                    {/* Họ và tên */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {member.user.avatar ? (
                            <AvatarImage src={member.user.avatar} alt={displayName} />
                          ) : null}
                          <AvatarFallback>
                            {(member.user.name || member.user.email).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{lastName}</span>
                            <span className="font-medium">{firstName}</span>
                            {isSelf ? <Badge variant="outline" className="text-xs">Bạn</Badge> : null}
                          </div>
                          <span className="text-xs text-muted-foreground">{member.user.email}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Tên hiển thị */}
                    <TableCell className="text-sm">
                      {displayName}
                    </TableCell>

                    {/* Email */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{member.user.email}</span>
                      </div>
                    </TableCell>

                    {/* Vai trò */}
                    <TableCell>
                      <Badge variant={badgeVariant}>{displayRole}</Badge>
                    </TableCell>

                    {/* Ngày tham gia */}
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(member.joinedAt)}
                    </TableCell>

                    {/* Hành động */}
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
