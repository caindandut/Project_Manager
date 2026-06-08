import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AlertTriangle, ArrowLeft, FolderKanban, LoaderCircle, Settings, Trash2 } from "lucide-react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useProjectDetailQuery, useUpdateProjectMutation, useDeleteProjectMutation } from "@/hooks/useProject"
import { useWorkspaceDetailQuery } from "@/hooks/useWorkspaces"
import { useProjectMembersQuery } from "@/hooks/useProjectMembers"
import { useAuth } from "@/hooks/useAuth"
import { toVietnameseErrorMessage } from "@/lib/error-messages"

export default function ProjectSettingsPage() {
  const params = useParams<{ workspaceId: string; projectId: string }>()
  const workspaceSlug = params.workspaceId || ""
  const projectId = Number(params.projectId || "0")
  const navigate = useNavigate()

  const workspaceQuery = useWorkspaceDetailQuery(workspaceSlug)
  const projectQuery = useProjectDetailQuery(workspaceSlug, projectId)
  const projectMembersQuery = useProjectMembersQuery(projectId)
  const { user } = useAuth()
  const updateMutation = useUpdateProjectMutation(workspaceSlug, projectId)
  const deleteMutation = useDeleteProjectMutation(workspaceSlug)
  const project = projectQuery.data

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isDirty, setIsDirty] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const currentProjectMember = projectMembersQuery.data?.data?.find(
    (member) => member.user.id === user?.id,
  )
  const canEdit = currentProjectMember?.role === "ADMIN" && currentProjectMember.status === "ACCEPTED"
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

  const handleDeleteProject = async () => {
    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(projectId)
      toast.success(`Dự án "${project?.name}" đã được chuyển vào lưu trữ. Bạn có thể khôi phục trong vòng 30 ngày.`)
      navigate(`/workspaces/${workspaceSlug}/projects`)
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, "Không thể xóa dự án."))
    } finally {
      setIsDeleting(false)
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
                Chỉ admin dự án mới có thể chỉnh sửa
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone - chỉ hiện với ADMIN */}
      {canEdit && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Vùng nguy hiểm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Xóa dự án này</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dự án sẽ được lưu trữ trong <strong>30 ngày</strong> và có thể khôi phục.
                  Sau 30 ngày sẽ bị xóa vĩnh viễn.<br />
                  <span className="text-amber-600 dark:text-amber-400">
                    ⚠ Yêu cầu: Tất cả công việc phải ở trạng thái Hoàn thành hoặc Đã hủy.
                  </span>
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Xóa dự án
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xóa dự án &quot;{project?.name}&quot;?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">
                        Dự án sẽ được lưu trữ trong <strong>30 ngày</strong>. Trong thời gian này, bạn có thể khôi phục dự án từ danh sách lưu trữ.
                      </span>
                      <span className="block text-amber-600 dark:text-amber-400">
                        ⚠ Lưu ý: Tất cả công việc trong dự án phải ở trạng thái Hoàn thành (Done) hoặc Đã hủy (Cancelled) trước khi xóa.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeleteProject}
                    >
                      Xác nhận xóa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
