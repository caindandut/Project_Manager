import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { LoaderCircle, Settings, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useUpdateWorkspaceMutation,
  useWorkspaceDetailQuery,
  useDeleteWorkspaceMutation,
} from "@/hooks/useWorkspaces"
import { getLastWorkspaceSlug, LAST_WORKSPACE_SLUG_KEY, setLastWorkspaceSlug } from "@/stores/authStore"
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

const TEAM_SIZES = [
  { value: "solo", label: "Chỉ mình tôi" },
  { value: "2-10", label: "2-10 người" },
  { value: "11-50", label: "11-50 người" },
  { value: "51+", label: "Hơn 50 người" },
]

export default function WorkspaceGeneralSettings() {
  const params = useParams()
  const navigate = useNavigate()
  const workspaceSlug = params.workspaceId || ""

  const { data: workspace, isLoading } = useWorkspaceDetailQuery(workspaceSlug)
  const updateMutation = useUpdateWorkspaceMutation(workspaceSlug)
  const deleteMutation = useDeleteWorkspaceMutation()

  const [name, setName] = useState("")
  const [teamSize, setTeamSize] = useState("solo")
  const [isDirty, setIsDirty] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (workspace) {
      setName(workspace.name || "")
      setTeamSize(workspace.teamSize || "solo")
    }
  }, [workspace])

  const getWorkspaceUrl = () => `${window.location.origin}/workspaces/${workspace?.slug}`

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Tên không gian làm việc không được để trống.")
      return
    }

    try {
      const updatedWorkspace = await updateMutation.mutateAsync({
        name: name.trim(),
        teamSize,
      })
      toast.success("Đã lưu thay đổi.")
      setIsDirty(false)

      if (updatedWorkspace && updatedWorkspace.slug && updatedWorkspace.slug !== workspaceSlug) {
        setLastWorkspaceSlug(updatedWorkspace.slug)
        navigate(`/workspaces/${updatedWorkspace.slug}/settings`, { replace: true })
      }
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, "Không thể lưu thay đổi."))
    }
  }

  const handleDeleteWorkspace = async () => {
    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(workspaceSlug)
      toast.success(`Không gian làm việc "${workspace?.name}" đã bị xóa.`)
      
      // Xóa workspace slug hiện tại khỏi local storage để tránh lỗi auto-redirect
      const lastSlug = getLastWorkspaceSlug()
      if (lastSlug === workspaceSlug) {
        window.localStorage.removeItem(LAST_WORKSPACE_SLUG_KEY)
      }
      navigate("/workspaces?view=list", { replace: true })
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, "Không thể xóa không gian làm việc."))
    } finally {
      setIsDeleting(false)
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

  const canEdit = workspace?.role === "OWNER" || workspace?.role === "ADMIN"
  const isSaving = updateMutation.isPending

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
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Cài đặt chung</h1>
          <p className="text-sm text-muted-foreground">
            Cập nhật thông tin không gian làm việc.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-base font-semibold text-primary">
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

          <div className="space-y-2">
            <Label htmlFor="workspace-team-size">Quy mô thành viên</Label>
            <Select
              value={teamSize}
              onValueChange={(val) => {
                setTeamSize(val)
                setIsDirty(true)
              }}
              disabled={!canEdit || isSaving}
            >
              <SelectTrigger id="workspace-team-size" className="w-full">
                <SelectValue placeholder="Chọn quy mô thành viên" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-3">
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

            {/* Nút xóa workspace - chỉ hiện với ADMIN */}
            {canEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="gap-1.5"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Xóa không gian làm việc
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xóa không gian làm việc &quot;{workspace?.name}&quot;?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">
                        Workspace sẽ được chuyển vào kho lưu trữ trong 30 ngày. Trong thời gian này, bạn (Admin) có thể khôi phục lại toàn bộ dữ liệu, dự án và thành viên. Sau 30 ngày, workspace sẽ bị xóa vĩnh viễn.
                      </span>
                      <span className="block text-amber-600 dark:text-amber-400">
                        ⚠ Lưu ý: Tất cả công việc trong mọi dự án phải ở trạng thái Hoàn thành (Done) hoặc Đã hủy (Cancelled) trước khi xóa.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeleteWorkspace}
                    >
                      Xác nhận xóa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
