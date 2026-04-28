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
import type { WorkspaceRole } from "@/types/workspace"

interface InviteMemberDialogProps {
  workspaceId: string | number
  membersPage: number
  membersLimit: number
}

type InviteFormState = {
  email: string
  role: Exclude<WorkspaceRole, "OWNER">
}

const ROLE_LABELS: Record<Exclude<WorkspaceRole, "OWNER">, string> = {
  ADMIN: "Admin",
  MEMBER: "Member",
  GUEST: "Guest",
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

  const resetForm = () => {
    setForm({ email: "", role: "MEMBER" })
  }

  const handleInvite = async (closeAfter: boolean) => {
    try {
      await inviteMutation.mutateAsync({
        email: form.email.trim(),
        role: form.role,
      })
      toast.success("Đã gửi lời mời.")
      if (closeAfter) {
        resetForm()
        setOpen(false)
      } else {
        resetForm()
      }
    } catch (error) {
      toast.error(
        toVietnameseErrorMessage(error, "Không thể gửi lời mời. Vui lòng kiểm tra lại email."),
      )
    }
  }

  const isSending = inviteMutation.isPending

  return (
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
                {(["ADMIN", "MEMBER", "GUEST"] as const).map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
