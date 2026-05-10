import { useState, useRef, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  Calendar,
  FolderKanban,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import InviteProjectMemberDialog from "@/components/project/InviteProjectMemberDialog"
import type { Project } from "@/lib/project-api"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

interface OverviewHeaderProps {
  project: Project | undefined
  isLoading: boolean
  workspaceSlug: string
  workspaceName: string
  workspaceId?: number
  canManage: boolean
  onUpdateProject: (payload: { name?: string; description?: string }) => Promise<void>
}

export default function OverviewHeader({
  project,
  isLoading,
  workspaceSlug,
  workspaceName,
  workspaceId,
  canManage,
  onUpdateProject,
}: OverviewHeaderProps) {
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [nameValue, setNameValue] = useState("")
  const [descValue, setDescValue] = useState("")
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editingName && nameRef.current) nameRef.current.focus()
  }, [editingName])
  useEffect(() => {
    if (editingDesc && descRef.current) descRef.current.focus()
  }, [editingDesc])

  const handleNameSave = async () => {
    setEditingName(false)
    if (nameValue.trim() && nameValue.trim() !== project?.name) {
      try {
        await onUpdateProject({ name: nameValue.trim() })
        toast.success("Đã cập nhật tên dự án")
      } catch {
        toast.error("Không thể cập nhật tên dự án")
      }
    }
  }

  const handleDescSave = async () => {
    setEditingDesc(false)
    if (descValue !== (project?.description || "")) {
      try {
        await onUpdateProject({ description: descValue })
        toast.success("Đã cập nhật mô tả")
      } catch {
        toast.error("Không thể cập nhật mô tả")
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-60" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to={`/workspaces/${workspaceSlug}`} className="hover:text-foreground transition-colors">
          {workspaceName}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{project?.name || "Dự án"}</span>
      </div>

      {/* Title + Actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            {editingName ? (
              <input
                ref={nameRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={() => void handleNameSave()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleNameSave()
                  if (e.key === "Escape") setEditingName(false)
                }}
                className="w-full rounded-md border bg-background px-2 py-1 text-2xl font-semibold outline-none ring-2 ring-primary/30"
              />
            ) : (
              <h1
                className="text-2xl font-semibold text-foreground cursor-pointer hover:text-primary/80 transition-colors"
                onClick={() => {
                  if (!canManage) return
                  setNameValue(project?.name || "")
                  setEditingName(true)
                }}
                title={canManage ? "Nhấn để sửa tên" : undefined}
              >
                {project?.name}
              </h1>
            )}

            {editingDesc ? (
              <textarea
                ref={descRef}
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                onBlur={() => void handleDescSave()}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingDesc(false)
                }}
                rows={2}
                className="w-full rounded-md border bg-background px-2 py-1 text-sm text-muted-foreground outline-none ring-2 ring-primary/30 resize-none"
              />
            ) : (
              <p
                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground/70 transition-colors max-w-2xl"
                onClick={() => {
                  if (!canManage) return
                  setDescValue(project?.description || "")
                  setEditingDesc(true)
                }}
                title={canManage ? "Nhấn để sửa mô tả" : undefined}
              >
                {project?.description || "Chưa có mô tả. Nhấn để thêm mô tả cho dự án."}
              </p>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              {project?.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Tạo {format(new Date(project.createdAt), "dd/MM/yyyy", { locale: vi })}
                </span>
              )}
              {project?.owner && (
                <span>bởi {project.owner.name || project.owner.email}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Link to={`/workspaces/${workspaceSlug}/projects/${project?.id}/list`}>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tạo công việc</span>
            </Button>
          </Link>

          {canManage && workspaceId && project && (
            <InviteProjectMemberDialog
              projectId={project.id}
              workspaceId={workspaceId}
            />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to={`/workspaces/${workspaceSlug}/projects/${project?.id}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Cài đặt dự án
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa dự án
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
