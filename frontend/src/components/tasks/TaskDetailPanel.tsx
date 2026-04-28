import {
  ArrowLeft,
  Check,
  Clock,
  LoaderCircle,
  MessageSquare,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { formatDistanceToNow, parseISO } from "date-fns"
import { vi } from "date-fns/locale"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog"
import {
  useCreateCommentMutation,
  useCreateSubTaskMutation,
  useDeleteAttachmentMutation,
  useDeleteCommentMutation,
  useDeleteTaskMutation,
  useTaskDetailQuery,
  useToggleSubTaskMutation,
  useUpdateTaskMutation,
  useUploadAttachmentMutation,
} from "@/hooks/useTasks"
import { downloadAttachment } from "@/lib/project-api"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import { cn } from "@/lib/utils"
import type { CreateTaskPayload, TaskPriority, TaskStatus, TaskUser } from "@/types/task"
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/types/task"

interface TaskDetailPanelProps {
  taskId: number | null
  projectId: number
  projectKey: string
  open: boolean
  onClose: () => void
  projectMembers: TaskUser[]
  onTaskUpdated?: () => void
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    HIGHEST: "bg-red-100 text-red-700 border-red-200",
    HIGH: "bg-red-50 text-red-600 border-red-100",
    MEDIUM: "bg-yellow-50 text-yellow-600 border-yellow-100",
    LOW: "bg-gray-100 text-gray-600 border-gray-200",
    LOWEST: "bg-gray-50 text-gray-400 border-gray-100",
  }
  return (
    <Badge
      variant="outline"
      className={cn("cursor-pointer hover:opacity-80 transition-opacity", styles[priority] || "")}
    >
      {TASK_PRIORITY_LABELS[priority as keyof typeof TASK_PRIORITY_LABELS] || priority}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    TODO: "bg-gray-100 text-gray-600 border-gray-200",
    IN_PROGRESS: "bg-blue-50 text-blue-600 border-blue-100",
    REVIEW: "bg-yellow-50 text-yellow-600 border-yellow-100",
    DONE: "bg-green-50 text-green-600 border-green-100",
    CANCELLED: "bg-red-50 text-red-400 border-red-100",
  }
  return (
    <Badge
      variant="outline"
      className={cn("cursor-pointer hover:opacity-80 transition-opacity", styles[status] || "")}
    >
      {TASK_STATUS_LABELS[status as keyof typeof TASK_STATUS_LABELS] || status}
    </Badge>
  )
}

const STATUS_OPTIONS: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"]

export default function TaskDetailPanel({
  taskId,
  projectId,
  projectKey,
  open,
  onClose,
  projectMembers,
}: TaskDetailPanelProps) {
  const { data: task, isLoading } = useTaskDetailQuery(taskId)
  const updateMutation = useUpdateTaskMutation(projectId)
  const deleteMutation = useDeleteTaskMutation(projectId)
  const createSubTaskMutation = useCreateSubTaskMutation(projectId)
  const toggleSubTaskMutation = useToggleSubTaskMutation(projectId)
  const createCommentMutation = useCreateCommentMutation(taskId ?? 0)
  const deleteCommentMutation = useDeleteCommentMutation(taskId ?? 0)
  const uploadAttachmentMutation = useUploadAttachmentMutation(taskId ?? 0)
  const deleteAttachmentMutation = useDeleteAttachmentMutation(taskId ?? 0)

  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState("")
  const [editingDesc, setEditingDesc] = useState(false)
  const [description, setDescription] = useState("")
  const [comment, setComment] = useState("")
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null)

  // Subtask dialog state
  const [createSubtaskDialogOpen, setCreateSubtaskDialogOpen] = useState(false)

  // Sync task data into local state
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || "")
    }
  }, [task])

  // Auto-save title
  useEffect(() => {
    if (!task || !title || title === task.title) return
    const timeout = setTimeout(() => {
      updateMutation.mutate(
        { taskId: task.id, payload: { title: title.trim() } },
        {
          onError: (e) => toast.error(toVietnameseErrorMessage(e, "Không thể lưu tiêu đề.")),
        },
      )
    }, 600)
    return () => clearTimeout(timeout)
  }, [title, task, updateMutation])

  // Save description on blur or button click
  const handleSaveDescription = () => {
    if (!task) return
    if (description === (task.description || "")) {
      setEditingDesc(false)
      return
    }
    updateMutation.mutate(
      { taskId: task.id, payload: { description: description || undefined } },
      {
        onSuccess: () => {
          toast.success("Đã lưu mô tả.")
          setEditingDesc(false)
        },
        onError: (e) => toast.error(toVietnameseErrorMessage(e, "Không thể lưu mô tả.")),
      },
    )
  }

  // Keyboard close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  if (!open) return null

  const handleStatusChange = (status: TaskStatus) => {
    if (!task) return
    updateMutation.mutate(
      { taskId: task.id, payload: { status } },
      {
        onSuccess: () => toast.success("Đã cập nhật trạng thái."),
        onError: (e) => toast.error(toVietnameseErrorMessage(e, "Không thể cập nhật trạng thái.")),
      },
    )
  }

  const handlePriorityChange = (priority: string) => {
    if (!task) return
    updateMutation.mutate(
      { taskId: task.id, payload: { priority: priority as TaskPriority } },
      {
        onSuccess: () => toast.success("Đã cập nhật mức ưu tiên."),
        onError: (e) => toast.error(toVietnameseErrorMessage(e, "Không thể cập nhật mức ưu tiên.")),
      },
    )
  }

  const handleAssigneeChange = (assigneeId: number | null) => {
    if (!task) return
    updateMutation.mutate(
      { taskId: task.id, payload: { assigneeId } },
      {
        onSuccess: () => toast.success("Đã cập nhật người phụ trách."),
        onError: (e) => toast.error(toVietnameseErrorMessage(e, "Không thể cập nhật người phụ trách.")),
      },
    )
  }

  const handleStartDateChange = (date: string) => {
    if (!task) return
    updateMutation.mutate(
      { taskId: task.id, payload: { startDate: date || null } },
      {
        onError: (e) => toast.error(toVietnameseErrorMessage(e, "Không thể cập nhật ngày bắt đầu.")),
      },
    )
  }

  const handleDueDateChange = (date: string) => {
    if (!task) return
    updateMutation.mutate(
      { taskId: task.id, payload: { dueDate: date || null } },
      {
        onError: (e) => toast.error(toVietnameseErrorMessage(e, "Không thể cập nhật ngày hết hạn.")),
      },
    )
  }

  const handleCreateSubTask = async (payload: CreateTaskPayload) => {
    if (!task) return
    try {
      await createSubTaskMutation.mutateAsync({
        taskId: task.id,
        payload,
      })
      toast.success("Đã thêm công việc con.")
      setCreateSubtaskDialogOpen(false)
    } catch (e) {
      toast.error(toVietnameseErrorMessage(e, "Không thể thêm công việc con."))
    }
  }

  const handleToggleSubTask = async (subTaskId: number, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE"
    try {
      await toggleSubTaskMutation.mutateAsync({ taskId: subTaskId, completed: newStatus === "DONE" })
      toast.success(newStatus === "DONE" ? "Đã hoàn thành công việc con." : "Đã mở lại công việc con.")
    } catch (e) {
      toast.error(toVietnameseErrorMessage(e, "Không thể cập nhật công việc con."))
    }
  }

  const handleAddComment = async () => {
    if (!task || !comment.trim()) return
    try {
      await createCommentMutation.mutateAsync(comment.trim())
      setComment("")
      toast.success("Đã thêm bình luận.")
    } catch (e) {
      toast.error(toVietnameseErrorMessage(e, "Không thể thêm bình luận."))
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteCommentMutation.mutateAsync(commentId)
      toast.success("Đã xóa bình luận.")
    } catch (e) {
      toast.error(toVietnameseErrorMessage(e, "Không thể xóa bình luận."))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !task) return
    try {
      await uploadAttachmentMutation.mutateAsync(file)
      toast.success("Đã tải tệp lên.")
    } catch (e) {
      toast.error(toVietnameseErrorMessage(e, "Không thể tải tệp lên."))
    }
    if (fileInput) fileInput.value = ""
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await deleteAttachmentMutation.mutateAsync(attachmentId)
      toast.success("Đã xóa tệp đính kèm.")
    } catch (e) {
      toast.error(toVietnameseErrorMessage(e, "Không thể xóa tệp đính kèm."))
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return
    try {
      await deleteMutation.mutateAsync(task.id)
      toast.success("Đã xóa công việc.")
      onClose()
    } catch (e) {
      toast.error(toVietnameseErrorMessage(e, "Không thể xóa công việc."))
    }
  }

  const PRIORITY_OPTIONS: TaskPriority[] = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"]

  // Get parent task key for display
  const getTaskKey = (id: number) => {
    return `${projectKey}-${id}`
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-[520px] bg-background border-l border-border shadow-xl flex flex-col overflow-hidden animate-slide-in-from-right duration-300">
        {isLoading || !task ? (
          <div className="flex-1 flex items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 p-5 border-b border-border">
              {task.parent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const event = new CustomEvent("openTaskDetail", { detail: { taskId: task.parent!.id } })
                    window.dispatchEvent(event)
                  }}
                  title={`Quay về ${getTaskKey(task.parent.id)}`}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">
                    {task.parent ? `${getTaskKey(task.parent.id)} → ` : ""}{task.id}
                  </span>
                  <StatusBadge status={task.status} />
                </div>
                {editingTitle ? (
                  <input
                    className="text-lg font-semibold w-full bg-transparent border-b-2 border-[#0052CC] outline-none pb-0.5"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => setEditingTitle(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingTitle(false)
                      if (e.key === "Escape") {
                        setTitle(task.title)
                        setEditingTitle(false)
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <h2
                    className="text-lg font-semibold cursor-pointer hover:text-[#0052CC] transition-colors truncate"
                    onClick={() => setEditingTitle(true)}
                    title="Click để chỉnh sửa"
                  >
                    {task.title}
                  </h2>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={handleDeleteTask}
                  title="Xóa công việc"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#5E6C84] uppercase">Mô tả</Label>
                  {editingDesc && (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-[#0052CC] hover:bg-[#0043A6]"
                      onClick={handleSaveDescription}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <LoaderCircle className="h-3 w-3 animate-spin" />
                      ) : (
                        "Lưu"
                      )}
                    </Button>
                  )}
                </div>
                {editingDesc ? (
                  <Textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                    }}
                    onBlur={handleSaveDescription}
                    className="min-h-[80px] resize-none text-sm"
                    autoFocus
                  />
                ) : (
                  <div
                    className={cn(
                      "text-sm rounded-md p-2 cursor-pointer hover:bg-muted/50 transition-colors min-h-[40px]",
                      !task.description && "text-muted-foreground italic",
                    )}
                    onClick={() => setEditingDesc(true)}
                  >
                    {task.description || "Nhấn để thêm mô tả..."}
                  </div>
                )}
              </div>

              {/* Properties */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-[#5E6C84] uppercase">Thuộc tính</Label>

                <div className="grid grid-cols-2 gap-3">
                  {/* Status */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Trạng thái</span>
                    <div className="flex justify-start">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button>
                            <StatusBadge status={task.status} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          {STATUS_OPTIONS.map((s) => (
                            <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)}>
                              <StatusBadge status={s} />
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Mức ưu tiên</span>
                    <div className="flex justify-start">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button>
                            <PriorityBadge priority={task.priority} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          {PRIORITY_OPTIONS.map((p) => (
                            <DropdownMenuItem key={p} onClick={() => handlePriorityChange(p)}>
                              <PriorityBadge priority={p} />
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Assignee */}
                  <div className="space-y-1 col-span-2">
                    <span className="text-xs text-muted-foreground">Người phụ trách</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-full flex items-center gap-2 text-left">
                          {task.assignee ? (
                            <>
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={task.assignee.avatar ?? undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {task.assignee.name?.[0] ?? "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {task.assignee.name ?? task.assignee.email}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Chưa giao</span>
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
                        <DropdownMenuItem onClick={() => handleAssigneeChange(null)}>
                          <span className="text-sm text-muted-foreground italic">Chưa giao</span>
                        </DropdownMenuItem>
                        {projectMembers.map((m) => (
                          <DropdownMenuItem key={m.id} onClick={() => handleAssigneeChange(m.id)}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={m.avatar ?? undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {m.name?.[0] ?? "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{m.name ?? m.email}</span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Start date */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Ngày bắt đầu</span>
                    <input
                      type="date"
                      value={task.startDate ? String(task.startDate).split("T")[0] : ""}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* Due date */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Ngày hết hạn</span>
                    <input
                      type="date"
                      value={task.dueDate ? String(task.dueDate).split("T")[0] : ""}
                      onChange={(e) => handleDueDateChange(e.target.value)}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* SubTasks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-xs font-semibold text-[#5E6C84] uppercase">
                      Công việc con
                    </Label>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {task.subTasks?.length ?? 0}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setCreateSubtaskDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Thêm
                  </Button>
                </div>

                {/* Subtask list */}
                <div className="space-y-1.5">
                  {task.subTasks?.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/50 group transition-colors cursor-pointer"
                      onClick={() => {
                        // Open subtask detail - emit event to parent
                        const event = new CustomEvent("openTaskDetail", { detail: { taskId: st.id } })
                        window.dispatchEvent(event)
                      }}
                    >
                      <button
                        className={cn(
                          "h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                          st.status === "DONE"
                            ? "bg-[#0052CC] border-[#0052CC]"
                            : "border-muted-foreground/40 hover:border-[#0052CC]",
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleSubTask(st.id, st.status)
                        }}
                      >
                        {st.status === "DONE" && <Check className="h-2.5 w-2.5 text-white" />}
                      </button>
                      <span
                        className={cn(
                          "text-sm flex-1 truncate",
                          st.status === "DONE" && "line-through text-muted-foreground",
                        )}
                      >
                        {st.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(parseISO(st.createdAt), { addSuffix: true, locale: vi })}
                      </span>
                    </div>
                  ))}
                  {(!task.subTasks || task.subTasks.length === 0) && (
                    <p className="text-xs text-muted-foreground italic text-center py-2">
                      Chưa có công việc con
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Comments */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs font-semibold text-[#5E6C84] uppercase">
                    Bình luận
                  </Label>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {task.comments?.length ?? 0}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {task.comments?.map((c) => (
                    <div key={c.id} className="flex gap-2.5 group/comment">
                      <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                        <AvatarImage src={c.user.avatar ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {c.user.name?.[0] ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium">
                            {c.user.name ?? c.user.email}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(parseISO(c.createdAt), { addSuffix: true, locale: vi })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover/comment:opacity-100 transition-opacity flex-shrink-0"
                        onClick={() => handleDeleteComment(c.id)}
                        title="Xóa bình luận"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add comment */}
                <div className="flex gap-2">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Viết bình luận..."
                    className="min-h-[60px] resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleAddComment()
                      }
                    }}
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-[#0052CC] hover:bg-[#0043A6]"
                  onClick={handleAddComment}
                  disabled={!comment.trim() || createCommentMutation.isPending}
                >
                  {createCommentMutation.isPending ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : null}
                  Gửi bình luận
                </Button>
              </div>

              <Separator />

              {/* Attachments */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs font-semibold text-[#5E6C84] uppercase">
                    Tệp đính kèm
                  </Label>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {task.attachments?.length ?? 0}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {task.attachments?.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 p-2 rounded-md border border-border hover:border-[#0052CC] group transition-colors cursor-pointer"
                      onClick={async () => {
                        try {
                          await downloadAttachment(att.id, att.fileName)
                        } catch (error) {
                          toast.error(toVietnameseErrorMessage(error, "Không thể tải tệp xuống."))
                        }
                      }}
                      title={`Tải xuống ${att.fileName}`}
                    >
                      <div className="h-8 w-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{att.fileName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(att.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAttachment(att.id)
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <input
                  ref={setFileInput}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => fileInput?.click()}
                  disabled={uploadAttachmentMutation.isPending}
                >
                  {uploadAttachmentMutation.isPending ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Tải tệp lên
                </Button>
              </div>

              <Separator />

              {/* Activity Log */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs font-semibold text-[#5E6C84] uppercase">
                    Lịch sử hoạt động
                  </Label>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {task.activities?.length ?? 0}
                  </Badge>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {task.activities && task.activities.length > 0 ? (
                    task.activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3">
                        <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                          <AvatarImage src={activity.user?.avatar ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {activity.user?.name?.[0] ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium">
                              {activity.user?.name ?? "Người dùng"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(parseISO(activity.createdAt), {
                                addSuffix: true,
                                locale: vi,
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {getActivityDescription(activity, projectMembers)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic text-center py-4">
                      Chưa có hoạt động nào
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Subtask Dialog */}
      <CreateTaskDialog
        open={createSubtaskDialogOpen}
        onOpenChange={setCreateSubtaskDialogOpen}
        onSubmit={handleCreateSubTask}
        projectMembers={projectMembers}
      />
    </>
  )
}

function getActivityDescription(
  activity: {
    action: string
    field: string | null
    oldValue: string | null
    newValue: string | null
    metadata?: Record<string, unknown> | null
  },
  projectMembers?: TaskUser[]
) {
  const fieldLabels: Record<string, string> = {
    title: "tiêu đề",
    description: "mô tả",
    status: "trạng thái",
    priority: "mức ưu tiên",
    dueDate: "ngày hết hạn",
    startDate: "ngày bắt đầu",
    assignee: "người phụ trách",
  }

  const field = activity.field || activity.action.toLowerCase()
  const fieldLabel = fieldLabels[field] || field

  switch (activity.action) {
    case "UPDATE":
      if (activity.oldValue === null && activity.newValue !== null) {
        return `đã cập nhật ${fieldLabel}: ${formatActivityValue(field, activity.newValue, projectMembers)}`
      }
      if (activity.oldValue !== null && activity.newValue === null) {
        return `đã xóa ${fieldLabel}`
      }
      return `đã thay đổi ${fieldLabel}: ${formatActivityValue(field, activity.oldValue, projectMembers)} → ${formatActivityValue(field, activity.newValue, projectMembers)}`
    case "CREATE":
      return `đã tạo công việc`
    case "DELETE":
      return `đã xóa công việc`
    case "COMMENT_CREATE":
      return `đã bình luận`
    case "COMMENT_UPDATE":
      return `đã chỉnh sửa bình luận`
    case "COMMENT_DELETE":
      return `đã xóa bình luận`
    case "ATTACHMENT_UPLOAD":
      const uploadFileName = activity.metadata?.fileName ?? activity.newValue ?? "tệp đính kèm"
      return `đã tải tệp lên: ${uploadFileName}`
    case "ATTACHMENT_DELETE":
      const deleteFileName = activity.metadata?.fileName ?? activity.oldValue ?? activity.newValue ?? ""
      return `đã xóa tệp đính kèm: ${deleteFileName}`
    default:
      return activity.action
  }
}

function formatActivityValue(
  field: string,
  value: string | null,
  projectMembers?: TaskUser[]
): string {
  if (!value) return "trống"

  switch (field) {
    case "status":
      return TASK_STATUS_LABELS[value as keyof typeof TASK_STATUS_LABELS] || value
    case "priority":
      return TASK_PRIORITY_LABELS[value as keyof typeof TASK_PRIORITY_LABELS] || value
    case "dueDate":
    case "startDate":
      try {
        return formatDistanceToNow(parseISO(value), { addSuffix: true, locale: vi })
      } catch {
        return value
      }
    case "assignee":
      if (value === "null" || value === "undefined") return "chưa giao"
      const memberId = parseInt(value, 10)
      if (!isNaN(memberId) && projectMembers) {
        const member = projectMembers.find((m) => m.id === memberId)
        if (member) return member.name ?? member.email
      }
      return `thành viên #${value}`
    default:
      return value
  }
}
