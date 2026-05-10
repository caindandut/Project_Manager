import { useState } from "react"
import { LoaderCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateWorkspaceMutation } from "@/hooks/useWorkspaces"
import { toVietnameseErrorMessage } from "@/lib/error-messages"

export default function CreateWorkspacePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: "",
    description: "",
  })
  const createWorkspaceMutation = useCreateWorkspaceMutation(1, 6)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên workspace")
      return
    }

    try {
      const workspace = await createWorkspaceMutation.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
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
            <Label htmlFor="workspace-description" className="text-sm font-medium">
              Mô tả
            </Label>
            <textarea
              id="workspace-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Mô tả ngắn về mục tiêu và phạm vi làm việc của workspace (tùy chọn)"
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
            />
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
              disabled={createWorkspaceMutation.isPending}
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
