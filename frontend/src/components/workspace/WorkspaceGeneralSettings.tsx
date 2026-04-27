import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { LoaderCircle, Settings, Trash2, Upload } from "lucide-react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useDeleteWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useWorkspaceDetailQuery,
} from "@/hooks/useWorkspaces"
import { toVietnameseErrorMessage } from "@/lib/error-messages"

function getInitials(text: string): string {
  return (
    text
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "WS"
  )
}

export default function WorkspaceGeneralSettings() {
  const params = useParams()
  const navigate = useNavigate()
  const workspaceSlug = params.workspaceId || ""

  const { data: workspace, isLoading } = useWorkspaceDetailQuery(workspaceSlug)
  const updateMutation = useUpdateWorkspaceMutation(workspaceSlug)
  const deleteMutation = useDeleteWorkspaceMutation()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isDirty, setIsDirty] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (workspace) {
      setName(workspace.name || "")
      setDescription(workspace.description || "")
    }
  }, [workspace])

  const getWorkspaceUrl = () => {
    return `${window.location.origin}/workspaces/${workspace?.slug}`
  }

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
      toast.error("Tên không gian làm việc không được để trống.")
      return
    }

    try {
      await updateMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      toast.success("Đã lưu thay đổi.")
      setIsDirty(false)
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, "Không thể lưu thay đổi."))
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file hình ảnh.")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Kích thước file không được vượt quá 2MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const logoUrl = ev.target?.result as string
      try {
        await updateMutation.mutateAsync({ logo: logoUrl })
        toast.success("Đã cập nhật logo.")
        setIsDirty(false)
      } catch (error) {
        toast.error(toVietnameseErrorMessage(error, "Không thể cập nhật logo."))
      }
    }
    reader.readAsDataURL(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(workspaceSlug)
      toast.success("Đã xóa không gian làm việc.")
      setDeleteDialogOpen(false)
      navigate("/workspaces")
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, "Không thể xóa không gian làm việc."))
    }
  }

  const canEdit = workspace?.role === "OWNER" || workspace?.role === "ADMIN"
  const isSaving = updateMutation.isPending
  const isDeleting = deleteMutation.isPending

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-1 h-4 w-72" />
          </div>
        </div>
        <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#DEEBFF]">
          <Settings className="h-5 w-5 text-[#0052CC]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Cài đặt Chung</h1>
          <p className="text-sm text-muted-foreground">
            Cập nhật thông tin không gian làm việc.
          </p>
        </div>
      </div>

      {/* Form card */}
      <Card>
        <CardContent className="space-y-5">
          {/* Logo + name row */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Logo */}
            <div className="flex flex-col gap-3">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {workspace?.logo ? (
                  <Avatar className="h-12 w-12 rounded-lg">
                    <AvatarImage src={workspace.logo} alt={workspace.name} />
                    <AvatarFallback className="rounded-lg text-lg">
                      {getInitials(workspace.name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#DEEBFF] text-base font-semibold text-[#0052CC]">
                    {getInitials(workspace?.name || "WS")}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canEdit || isSaving}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Tải lên
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
            </div>

            {/* Tên không gian làm việc */}
            <div className="space-y-2">
              <Label htmlFor="workspace-name">
                Tên không gian làm việc <span className="text-destructive">*</span>
              </Label>
              <Input
                id="workspace-name"
                value={name}
                onChange={handleNameChange}
                placeholder="Nhập tên không gian làm việc"
                maxLength={100}
                disabled={!canEdit || isSaving}
              />
            </div>
          </div>

          {/* Địa chỉ URL */}
          <div className="space-y-2">
            <Label htmlFor="workspace-url">Địa chỉ URL không gian làm việc</Label>
            <Input
              id="workspace-url"
              value={getWorkspaceUrl()}
              readOnly
              disabled
              className="bg-muted/50"
            />
          </div>

          {/* Mô tả */}
          <div className="space-y-2">
            <Label htmlFor="workspace-description">Mô tả</Label>
            <textarea
              id="workspace-description"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Mô tả ngắn về không gian làm việc (tùy chọn)"
              maxLength={500}
              disabled={!canEdit || isSaving}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2 border-t pt-4">
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
                Chỉ Admin mới có thể chỉnh sửa
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete card — only shown to OWNER */}
      {workspace?.role === "OWNER" && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Vùng nguy hiểm</CardTitle>
            <CardDescription>
              Thao tác dưới đây không thể hoàn tác.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa không gian làm việc
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa không gian làm việc?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Thao tác này sẽ xóa vĩnh viễn không gian làm việc và tất cả dữ liệu
                    liên quan. Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Đang xóa...
                      </>
                    ) : (
                      "Xóa không gian làm việc"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
