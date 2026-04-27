import { useState } from "react"
import { LoaderCircle, UserPlus } from "lucide-react"
import { toast } from "sonner"

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
import { useInviteWorkspaceMemberMutation } from "@/hooks/useWorkspaces"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import { getWorkspaceRoleLabel } from "@/lib/workspace-role"

interface InviteMemberDialogProps {
  workspaceId: number
  membersPage: number
  membersLimit: number
}

type InviteFormState = {
  email: string
  role: "MEMBER" | "GUEST"
}

export default function InviteMemberDialog({
  workspaceId,
  membersPage,
  membersLimit,
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<InviteFormState>({
    email: "",
    role: "MEMBER",
  })
  const inviteMutation = useInviteWorkspaceMemberMutation(workspaceId, membersPage, membersLimit)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await inviteMutation.mutateAsync({
        email: form.email.trim(),
        role: form.role,
      })

      toast.success("Mời thành viên thành công.")
      setForm({ email: "", role: "MEMBER" })
      setOpen(false)
    } catch (error) {
      toast.error(
        toVietnameseErrorMessage(error, "Không thể thêm thành viên. Vui lòng kiểm tra lại email."),
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4" />
          <span>Mời thành viên</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mời thành viên vào workspace</DialogTitle>
          <DialogDescription>
            Email phải thuộc tài khoản đã đăng ký trong hệ thống. Hiện tại hệ thống chưa gửi lời mời qua email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member-email">Email thành viên</Label>
            <Input
              id="member-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="ten-thanh-vien@congty.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-role">Vai trò</Label>
            <Select
              value={form.role}
              onValueChange={(value: "MEMBER" | "GUEST") =>
                setForm((current) => ({ ...current, role: value }))
              }
            >
              <SelectTrigger id="member-role">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">{getWorkspaceRoleLabel("MEMBER")} - Thành viên làm việc</SelectItem>
                <SelectItem value="GUEST">{getWorkspaceRoleLabel("GUEST")} - Cộng tác viên xem và cập nhật cơ bản</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Đang thêm</span>
                </>
              ) : (
                "Thêm thành viên"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
