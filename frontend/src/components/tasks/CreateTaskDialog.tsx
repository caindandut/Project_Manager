import { useState } from "react"
import {
  CalendarDays,
  CircleDot,
  Flag,
  LoaderCircle,
  Plus,
  User,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { CreateTaskPayload, TaskPriority, TaskStatus, TaskUser } from "@/types/task"

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: CreateTaskPayload) => Promise<void>
  projectMembers: TaskUser[]
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "TODO", label: "Việc cần làm", color: "#6B7280" },
  { value: "IN_PROGRESS", label: "Đang tiến hành", color: "#3B82F6" },
  { value: "REVIEW", label: "Xem xét", color: "#F59E0B" },
]

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: "HIGHEST", label: "Cao nhất", color: "#DC2626" },
  { value: "HIGH", label: "Cao", color: "#F97316" },
  { value: "MEDIUM", label: "Trung bình", color: "#F59E0B" },
  { value: "LOW", label: "Thấp", color: "#3B82F6" },
  { value: "LOWEST", label: "Thấp nhất", color: "#6B7280" },
]

const INITIAL_FORM: CreateTaskPayload = {
  title: "",
  description: "",
  status: "TODO",
  priority: "MEDIUM",
  startDate: "",
  dueDate: "",
  estimatedHours: undefined,
  assigneeId: undefined,
}

export default function CreateTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  projectMembers,
}: CreateTaskDialogProps) {
  const [form, setForm] = useState<CreateTaskPayload>({ ...INITIAL_FORM })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setForm({ ...INITIAL_FORM })
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmit = async (closeAfter: boolean) => {
    if (!form.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề công việc.")
      return
    }

    if (form.startDate && form.dueDate && form.startDate > form.dueDate) {
      toast.error("Ngày bắt đầu không được sau ngày hết hạn.")
      return
    }

    setIsSubmitting(true)
    try {
      const payload: CreateTaskPayload = {
        ...form,
        startDate: form.startDate || undefined,
        dueDate: form.dueDate || undefined,
        estimatedHours: form.estimatedHours || undefined,
      }
      await onSubmit(payload)

      if (closeAfter) {
        toast.success("Đã tạo công việc thành công!")
        handleClose()
      } else {
        resetForm()
        toast.success("Đã tạo! Tiếp tục thêm công việc.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo công việc.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.charAt(0).toUpperCase()
    return email.charAt(0).toUpperCase()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-semibold">
            Tạo công việc mới
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-4">
          {/* ── Title ── */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-sm font-medium">
              Tiêu đề <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Nhập tiêu đề công việc"
              className="h-10"
              autoFocus
            />
          </div>

          {/* ── Description ── */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc" className="text-sm font-medium">
              Mô tả
            </Label>
            <Textarea
              id="task-desc"
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả chi tiết công việc (tùy chọn)"
              className="min-h-[90px] resize-none"
            />
          </div>

          <Separator />

          {/* ── Status & Priority ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                Trạng thái
              </Label>
              <Select
                value={form.status}
                onValueChange={(val) =>
                  setForm({ ...form, status: val as TaskStatus })
                }
              >
                <SelectTrigger id="task-status" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                Mức ưu tiên
              </Label>
              <Select
                value={form.priority}
                onValueChange={(val) =>
                  setForm({ ...form, priority: val as TaskPriority })
                }
              >
                <SelectTrigger id="task-priority" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <Flag
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: opt.color }}
                        />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Assignee ── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Người phụ trách
            </Label>
            <Select
              value={form.assigneeId !== undefined ? String(form.assigneeId) : "none"}
              onValueChange={(val) =>
                setForm({
                  ...form,
                  assigneeId: val === "none" ? undefined : Number(val),
                })
              }
            >
              <SelectTrigger id="task-assignee" className="h-10">
                <SelectValue placeholder="Chưa giao" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    Chưa giao
                  </span>
                </SelectItem>
                {projectMembers.map((member) => (
                  <SelectItem key={member.id} value={String(member.id)}>
                    <span className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.avatar || undefined} />
                        <AvatarFallback className="text-[10px] font-medium">
                          {getInitials(member.name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      {member.name ?? member.email}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* ── Start date & Due date ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-start" className="text-sm font-medium flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                Ngày bắt đầu
              </Label>
              <Input
                id="task-start"
                type="date"
                value={form.startDate ?? ""}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value || undefined })
                }
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due" className="text-sm font-medium flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                Ngày hết hạn
              </Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate ?? ""}
                onChange={(e) =>
                  setForm({ ...form, dueDate: e.target.value || undefined })
                }
                className="h-10"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="h-10"
          >
            Hủy
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="h-10 gap-1.5"
          >
            {isSubmitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Tạo thêm
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="h-10 bg-[#0052CC] hover:bg-[#0043A6] gap-1.5"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Tạo công việc
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
