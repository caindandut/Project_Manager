import { useState, useEffect, useMemo } from "react"
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

function normalizeSlug(text: string): string {
  let slug = text.toLowerCase()
  slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  slug = slug.replace(/\s+/g, "-")
  slug = slug.replace(/[^a-z0-9-]/g, "")
  slug = slug.replace(/-+/g, "-")
  slug = slug.replace(/^-+|-+$/g, "")
  return slug
}

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
    slug: "",
  })
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  useEffect(() => {
    if (form.name && !slugManuallyEdited) {
      setForm((prev) => ({ ...prev, slug: normalizeSlug(form.name) }))
    }
  }, [form.name, slugManuallyEdited])

  const isValidSlug = useMemo(() => {
    return /^[a-z0-9-]+$/.test(form.slug) && form.slug.length > 0
  }, [form.slug])

  const createWorkspaceMutation = useCreateWorkspaceMutation(page, limit)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await createWorkspaceMutation.mutateAsync({
        name: form.name.trim(),
        slug: form.slug.trim(),
      })

      toast.success("Tạo workspace thành công.")
      setForm({ name: "", slug: "" })
      setSlugManuallyEdited(false)
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
            <Label htmlFor="dialog-workspace-slug">Đường dẫn (URL)</Label>
            <Input
              id="dialog-workspace-slug"
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugManuallyEdited(true)
                setForm((current) => ({ ...current, slug: e.target.value }))
              }}
              placeholder="ten-khong-gian"
              maxLength={50}
              required
            />
            <p className="text-[0.8rem] text-muted-foreground break-all">
              Sẽ hiển thị tại: {window.location.host}/workspaces/<span className="font-medium text-foreground">{form.slug || "ten-khong-gian"}</span>
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createWorkspaceMutation.isPending || !isValidSlug}>
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
