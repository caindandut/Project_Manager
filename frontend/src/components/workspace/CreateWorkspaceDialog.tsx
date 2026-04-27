import { useState } from "react"
import { LoaderCircle, Plus } from "lucide-react"
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
import { useCreateWorkspaceMutation } from "@/hooks/useWorkspaces"
import { toVietnameseErrorMessage } from "@/lib/error-messages"

interface CreateWorkspaceDialogProps {
  page: number
  limit: number
  triggerLabel?: string
  buttonClassName?: string
}

export default function CreateWorkspaceDialog({
  page,
  limit,
  triggerLabel = "Tạo workspace mới",
  buttonClassName,
}: CreateWorkspaceDialogProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: "",
    description: "",
  })
  const createWorkspaceMutation = useCreateWorkspaceMutation(page, limit)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await createWorkspaceMutation.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      })

      toast.success("Tạo workspace thành công.")
      setForm({ name: "", description: "" })
      setOpen(false)
    } catch (error) {
      toast.error(
        toVietnameseErrorMessage(error, "Không thể tạo workspace. Vui lòng kiểm tra lại thông tin."),
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={buttonClassName ?? "h-9"}>
          <Plus className="h-4 w-4" />
          <span>{triggerLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo workspace mới</DialogTitle>
          <DialogDescription>
            Tạo một không gian làm việc để quản lý dự án, thành viên và công việc của đội.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Tên workspace</Label>
            <Input
              id="workspace-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ví dụ: Nền tảng khách hàng"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-description">Mô tả</Label>
            <Input
              id="workspace-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Mô tả ngắn về mục tiêu và phạm vi làm việc"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createWorkspaceMutation.isPending}>
              {createWorkspaceMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Đang tạo</span>
                </>
              ) : (
                "Tạo workspace"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
