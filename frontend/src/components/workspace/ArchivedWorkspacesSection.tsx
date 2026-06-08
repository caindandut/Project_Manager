import { useState } from "react"
import { ArchiveRestore, Clock, Loader2, Trash2, LayoutGrid } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useArchivedWorkspacesQuery, useRestoreWorkspaceMutation } from "@/hooks/useWorkspaces"
import { toVietnameseErrorMessage } from "@/lib/error-messages"

export default function ArchivedWorkspacesSection() {
  const { data: archivedWorkspaces, isLoading } = useArchivedWorkspacesQuery()
  const restoreMutation = useRestoreWorkspaceMutation()
  const [restoringId, setRestoringId] = useState<number | null>(null)

  const handleRestore = async (workspaceId: number, workspaceName: string) => {
    setRestoringId(workspaceId)
    try {
      await restoreMutation.mutateAsync(workspaceId)
      toast.success(`Đã khôi phục workspace "${workspaceName}" thành công.`)
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, `Không thể khôi phục workspace "${workspaceName}".`))
    } finally {
      setRestoringId(null)
    }
  }

  const getDaysLabel = (days: number) => {
    if (days === 0) return "Hết hạn hôm nay"
    if (days === 1) return "Còn 1 ngày"
    return `Còn ${days} ngày`
  }

  const getDaysBadgeVariant = (days: number): "default" | "secondary" | "destructive" | "outline" => {
    if (days <= 3) return "destructive"
    if (days <= 7) return "outline"
    return "secondary"
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-4 w-4" />
            Workspace đã lưu trữ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!archivedWorkspaces || archivedWorkspaces.length === 0) {
    return null
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900 mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
          <Trash2 className="h-4 w-4" />
          Workspace đã lưu trữ ({archivedWorkspaces.length})
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Các workspace này sẽ bị xóa vĩnh viễn sau 30 ngày kể từ khi xóa. Bạn có thể khôi phục chúng trong thời gian này.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {archivedWorkspaces.map((workspace) => (
          <div
            key={workspace.id}
            className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{workspace.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground font-mono">{workspace.slug}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Xóa {new Date(workspace.deletedAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={getDaysBadgeVariant(workspace.daysRemaining)} className="text-xs">
                {getDaysLabel(workspace.daysRemaining)}
              </Badge>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={restoringId === workspace.id}
                  >
                    {restoringId === workspace.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ArchiveRestore className="h-3 w-3" />
                    )}
                    Khôi phục
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Khôi phục workspace?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Workspace <strong>&quot;{workspace.name}&quot;</strong> sẽ được khôi phục về trạng thái hoạt động bình thường cùng với toàn bộ dữ liệu, dự án và công việc.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleRestore(workspace.id, workspace.name)}>
                      Khôi phục
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
