import { useState } from "react"
import { LoaderCircle } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateProjectMutation } from "@/hooks/useProjects"
import { toVietnameseErrorMessage } from "@/lib/error-messages"

export default function CreateProjectPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: "",
    key: "",
    description: "",
  })
  const createProjectMutation = useCreateProjectMutation(workspaceId || "")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên dự án")
      return
    }

    if (!form.key.trim()) {
      toast.error("Vui lòng nhập mã dự án")
      return
    }

    try {
      const project = await createProjectMutation.mutateAsync({
        name: form.name.trim(),
        key: form.key.trim().toUpperCase(),
        description: form.description.trim() || undefined,
      })

      toast.success("Tạo dự án thành công!")
      navigate(`/workspaces/${workspaceId}/projects/${project.id}`)
    } catch (error) {
      toast.error(
        toVietnameseErrorMessage(error, "Không thể tạo dự án. Vui lòng thử lại.")
      )
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Tạo dự án mới</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dự án là nơi bạn quản lý công việc, theo dõi tiến độ và cộng tác với đội.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-sm font-medium">
              Tên dự án <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ví dụ: Website công ty"
              className="h-10"
              required
            />
            <p className="text-xs text-muted-foreground">
              Tên dự án sẽ hiển thị trên trang chủ và trong thanh điều hướng.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-key" className="text-sm font-medium">
              Mã dự án <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-key"
              value={form.key}
              onChange={(event) => setForm((current) => ({ ...current, key: event.target.value.toUpperCase() }))}
              placeholder="Ví dụ: WEB"
              className="h-10"
              maxLength={10}
              required
            />
            <p className="text-xs text-muted-foreground">
              Mã dự án (3-10 ký tự, viết hoa) dùng để tạo mã công việc.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description" className="text-sm font-medium">
              Mô tả
            </Label>
            <textarea
              id="project-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Mô tả ngắn về mục tiêu và phạm vi của dự án (tùy chọn)"
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/workspaces/${workspaceId}`)}
              className="h-9"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={createProjectMutation.isPending}
              className="h-9 bg-[#0052CC] hover:bg-[#0043A6]"
            >
              {createProjectMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Đang tạo...</span>
                </>
              ) : (
                "Tạo dự án"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
