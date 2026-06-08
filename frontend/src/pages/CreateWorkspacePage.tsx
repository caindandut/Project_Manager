import { useState, useEffect, useMemo } from "react"
import { LoaderCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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

export default function CreateWorkspacePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: "",
    slug: "",
  })
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  // Only auto-generate slug if user hasn't manually edited it
  useEffect(() => {
    if (form.name && !slugManuallyEdited) {
      setForm((prev) => ({ ...prev, slug: normalizeSlug(form.name) }))
    }
  }, [form.name, slugManuallyEdited])

  const isValidSlug = useMemo(() => {
    return /^[a-z0-9-]+$/.test(form.slug) && form.slug.length > 0
  }, [form.slug])
  const createWorkspaceMutation = useCreateWorkspaceMutation(1, 6)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên workspace")
      return
    }

    if (!isValidSlug) {
      toast.error("Địa chỉ URL không hợp lệ")
      return
    }

    try {
      const workspace = await createWorkspaceMutation.mutateAsync({
        name: form.name.trim(),
        slug: form.slug.trim(),
      })

      toast.success("Tạo workspace thành công!")
      navigate(`/workspaces/${workspace.id}`)
    } catch (error) {
      toast.error(
        toVietnameseErrorMessage(error, "Không thể tạo workspace. Vui lòng thử lại.")
      )
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Tạo workspace mới</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Workspace là không gian làm việc cho đội của bạn. Bạn có thể tạo nhiều workspace cho các dự án hoặc bộ phận khác nhau.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="workspace-name" className="text-sm font-medium">
              Tên workspace <span className="text-destructive">*</span>
            </Label>
            <Input
              id="workspace-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ví dụ: Nền tảng khách hàng"
              className="h-10"
              required
            />
            <p className="text-xs text-muted-foreground">
              Tên workspace sẽ hiển thị trên trang chủ và trong thanh điều hướng.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-slug" className="text-sm font-medium">
              Địa chỉ URL
            </Label>
            <div className="flex items-center overflow-hidden rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
              <span className="truncate text-muted-foreground/70">{window.location.host}/workspaces/</span>
              <input
                id="workspace-slug"
                type="text"
                className="flex-1 min-w-0 bg-transparent outline-none"
                value={form.slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true)
                  setForm((current) => ({ ...current, slug: e.target.value }))
                }}
                placeholder="ten-khong-gian"
                maxLength={50}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="h-9"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={createWorkspaceMutation.isPending || !isValidSlug}
              className="h-9 bg-primary hover:bg-primary/90"
            >
              {createWorkspaceMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Đang tạo...</span>
                </>
              ) : (
                "Tạo workspace"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
