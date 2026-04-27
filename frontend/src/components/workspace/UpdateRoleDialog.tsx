import { useState } from "react"
import { LoaderCircle, ShieldCheck } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUpdateWorkspaceMemberRoleMutation } from "@/hooks/useWorkspaces"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import { getWorkspaceRoleLabel } from "@/lib/workspace-role"
import type { WorkspaceMember } from "@/types/workspace"

interface UpdateRoleDialogProps {
  workspaceId: number
  member: WorkspaceMember
  membersPage: number
  membersLimit: number
}

export default function UpdateRoleDialog({
  workspaceId,
  member,
  membersPage,
  membersLimit,
}: UpdateRoleDialogProps) {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<"MEMBER" | "GUEST">(member.role === "GUEST" ? "GUEST" : "MEMBER")
  const updateRoleMutation = useUpdateWorkspaceMemberRoleMutation(workspaceId, membersPage, membersLimit)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await updateRoleMutation.mutateAsync({
        memberId: member.id,
        payload: { role },
      })

      toast.success("Cập nhật vai trò thành công.")
      setOpen(false)
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, "Không thể cập nhật vai trò cho thành viên này."))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShieldCheck className="h-4 w-4" />
          <span>Đổi vai trò</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cập nhật vai trò</DialogTitle>
          <DialogDescription>
            Chọn vai trò mới cho {member.user.name || member.user.email}. Vai trò Admin không chỉnh từ màn này.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Vai trò mới</Label>
            <Select value={role} onValueChange={(value: "MEMBER" | "GUEST") => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">{getWorkspaceRoleLabel("MEMBER")} - Thành viên</SelectItem>
                <SelectItem value="GUEST">{getWorkspaceRoleLabel("GUEST")} - Khách cộng tác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Đang lưu</span>
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
