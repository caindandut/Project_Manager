import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, FolderKanban, LoaderCircle, Settings } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useProjectDetailQuery, useUpdateProjectMutation } from "@/hooks/useProject"
import { useWorkspaceDetailQuery } from "@/hooks/useWorkspaces"
import { toVietnameseErrorMessage } from "@/lib/error-messages"

export default function ProjectSettingsPage() {
  const params = useParams<{ workspaceId: string; projectId: string }>()
  const workspaceSlug = params.workspaceId || ""
  const projectId = Number(params.projectId || "0")

  const workspaceQuery = useWorkspaceDetailQuery(workspaceSlug)
  const projectQuery = useProjectDetailQuery(workspaceSlug, projectId)
  const updateMutation = useUpdateProjectMutation(workspaceSlug, projectId)
  const project = projectQuery.data

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    document.title = project
      ? `${project.name} | Cài đặt dự án`
      : "Cài đặt dự án | Project Manager"
  }, [project])

  useEffect(() => {
    if (project) {
      setName(project.name || "")
      setDescription(project.description || "")
    }
  }, [project])

  const workspaceRole = workspaceQuery.data?.role
  const canEdit =
    workspaceRole === "OWNER" || workspaceRole === "ADMIN" || workspaceRole === "MEMBER"
  const isSaving = updateMutation.isPending

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    setIsDirty(true)
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value)
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Tên dự án không được để trống.")
      return
    }

    try {
      await updateMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
      })
      toast.success("Đã lưu thay đổi.")
      setIsDirty(false)
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, "Không thể lưu thay đổi."))
    }
  }

  if (projectQuery.isLoading) {
    return (
      <div className="space-y-6 p-6 md:p-8 max-w-3xl">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-1 h-4 w-72" />
          </div>
        </div>
        <Card>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          to={`/workspaces/${workspaceSlug}`}
          className="hover:text-foreground transition-colors"
        >
          {workspaceQuery.data?.name || "Workspace"}
        </Link>
        <span>/</span>
        <Link
          to={`/workspaces/${workspaceSlug}/projects/${projectId}/overview`}
          className="hover:text-foreground transition-colors"
        >
          {project?.name || "Dự án"}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Cài đặt</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Cài đặt dự án</h1>
            <p className="text-sm text-muted-foreground">
              Cập nhật thông tin chung cho dự án.
            </p>
          </div>
        </div>
        <Link to={`/workspaces/${workspaceSlug}/projects/${projectId}/overview`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
        </Link>
      </div>

      {/* Settings Form */}
      <Card>
        <CardContent className="space-y-5">
          {/* Project icon + key */}
          <div className="flex items-center gap-4 pb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{project?.name}</p>
              <p className="text-xs text-muted-foreground">
                Mã dự án: <span className="font-mono font-semibold">{project?.key}</span>
              </p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">
              Tên dự án <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              value={name}
              onChange={handleNameChange}
              placeholder="Nhập tên dự án"
              maxLength={100}
              disabled={!canEdit || isSaving}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="project-description">Mô tả</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Nhập mô tả cho dự án (tùy chọn)"
              rows={4}
              maxLength={500}
              disabled={!canEdit || isSaving}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 ký tự
            </p>
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="project-url">Đường dẫn dự án</Label>
            <Input
              id="project-url"
              value={`${window.location.origin}/workspaces/${workspaceSlug}/projects/${projectId}`}
              readOnly
              disabled
              className="bg-muted/50 font-mono text-xs"
            />
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 border-t pt-4">
            <Button
              onClick={handleSave}
              disabled={!isDirty || !canEdit || isSaving}
            >
              {isSaving ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
            {!canEdit && (
              <span className="text-xs text-muted-foreground">
                Chỉ thành viên trở lên mới có thể chỉnh sửa
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
