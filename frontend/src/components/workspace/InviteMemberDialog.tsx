import { useState } from "react"
import { LoaderCircle, Trash2, UserPlus } from "lucide-react"
import { toast } from "sonner"

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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDeleteWorkspaceMutation, useInviteWorkspaceMemberMutation } from "@/hooks/useWorkspaces"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import type { WorkspaceRole } from "@/types/workspace"

interface InviteMemberDialogProps {
  workspaceId: string | number
  membersPage: number
  membersLimit: number
}

type InviteFormState = {
  email: string
  displayName: string
  role: WorkspaceRole
}

const ROLE_LABELS: Record<Exclude<WorkspaceRole, "OWNER">, string> = {
  ADMIN: "Admin",
  MEMBER: "Member",
  GUEST: "Guest",
}

const ROLE_DESCRIPTIONS: Record<Exclude<WorkspaceRole, "OWNER">, string> = {
  ADMIN: "Quản trị viên - toàn quyền quản lý workspace",
  MEMBER: "Thành viên - có thể tạo và chỉnh sửa dự án, công việc",
  GUEST: "Khách cộng tác - chỉ có quyền xem",
}

export default function InviteMemberDialog({
  workspaceId,
  membersPage,
  membersLimit,
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [form, setForm] = useState<InviteFormState>({
    email: "",
    displayName: "",
    role: "MEMBER",
  })

  const inviteMutation = useInviteWorkspaceMemberMutation(workspaceId, membersPage, membersLimit)
  const deleteMutation = useDeleteWorkspaceMutation()

  const resetForm = () => {
    setForm({ email: "", displayName: "", role: "MEMBER" })
  }

  const handleInvite = async (closeAfter: boolean) => {
    try {
      await inviteMutation.mutateAsync({
        email: form.email.trim(),
        role: form.role as Exclude<WorkspaceRole, "OWNER">,
      })
      toast.success("Đã thêm thành viên.")
      if (closeAfter) {
        resetForm()
        setOpen(false)
      } else {
        resetForm()
      }
    } catch (error) {
      toast.error(
        toVietnameseErrorMessage(error, "Không thể thêm thành viên. Vui lòng kiểm tra lại email."),
      )
    }
  }

  const handleDeleteWorkspace = async () => {
    try {
      await deleteMutation.mutateAsync(workspaceId)
      toast.success("Đã xóa không gian làm việc.")
      setDeleteDialogOpen(false)
      setOpen(false)
      window.location.href = "/workspaces"
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, "Không thể xóa không gian làm việc."))
    }
  }

  const isSending = inviteMutation.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <UserPlus className="h-4 w-4" />
            <span>Mời thành viên</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Mời thành viên</DialogTitle>
            <DialogDescription>
              Thêm thành viên mới vào không gian làm việc.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="ten-thanh-vien@congty.com"
                disabled={isSending}
              />
            </div>

            {/* Display name */}
            <div className="space-y-2">
              <Label htmlFor="invite-display-name">Tên hiển thị</Label>
              <Input
                id="invite-display-name"
                value={form.displayName}
                onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                placeholder="Nguyễn Văn A"
                disabled={isSending}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="invite-role">Vai trò</Label>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, role: value as Exclude<WorkspaceRole, "OWNER"> }))
                }
                disabled={isSending}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    <div className="flex flex-col gap-0.5">
                      <span>{ROLE_LABELS.ADMIN}</span>
                      <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.ADMIN}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MEMBER">
                    <div className="flex flex-col gap-0.5">
                      <span>{ROLE_LABELS.MEMBER}</span>
                      <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.MEMBER}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="GUEST">
                    <div className="flex flex-col gap-0.5">
                      <span>{ROLE_LABELS.GUEST}</span>
                      <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.GUEST}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-row sm:justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive h-8 px-2"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isSending}
              type="button"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Xóa không gian làm việc
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => void handleInvite(false)}
                disabled={isSending || !form.email.trim()}
                type="button"
              >
                {isSending ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Đang thêm...
                  </>
                ) : (
                  "Thêm nữa"
                )}
              </Button>
              <Button
                onClick={() => void handleInvite(true)}
                disabled={isSending || !form.email.trim()}
                type="button"
              >
                {isSending ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  "Gửi lời mời"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete workspace dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa không gian làm việc?</AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này sẽ xóa vĩnh viễn không gian làm việc và tất cả dữ liệu liên quan.
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa không gian làm việc"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
