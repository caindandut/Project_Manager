import { useState } from "react"
import { CalendarDays, ChevronDown, CircleDot, Flag, LoaderCircle, Plus, User } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { TaskDateTimePicker } from "@/components/tasks/TaskDateTimePicker"
import { fromDateTimeLocalValue } from "@/lib/date-time"
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
  assigneeIds: [],
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

  const toggleAssignee = (assigneeId: number) => {
    const current = form.assigneeIds ?? []
    setForm({
      ...form,
      assigneeIds: current.includes(assigneeId)
        ? current.filter((id) => id !== assigneeId)
        : [...current, assigneeId],
    })
  }

  const handleSubmit = async (closeAfter: boolean) => {
    if (!form.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề công việc.")
      return
    }

    if (form.startDate && form.dueDate && new Date(form.startDate) > new Date(form.dueDate)) {
      toast.error("Ngày bắt đầu không được sau ngày kết thúc.")
      return
    }

    setIsSubmitting(true)
    try {
      const assigneeIds = form.assigneeIds ?? []
      await onSubmit({
        ...form,
        startDate: fromDateTimeLocalValue(form.startDate),
        dueDate: fromDateTimeLocalValue(form.dueDate),
        estimatedHours: form.estimatedHours || undefined,
        assigneeId: assigneeIds[0],
        assigneeIds,
      })

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

  const selectedAssignees = projectMembers.filter((member) => form.assigneeIds?.includes(member.id))

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-[540px]">
        <DialogHeader className="px-6 pb-0 pt-6">
          <DialogTitle className="text-lg font-semibold">Tạo công việc mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-sm font-medium">
              Tiêu đề <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Nhập tiêu đề công việc"
              className="h-10"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc" className="text-sm font-medium">
              Mô tả
            </Label>
            <Textarea
              id="task-desc"
              value={form.description || ""}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Mô tả chi tiết công việc"
              className="min-h-[90px] resize-none"
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                Trạng thái
              </Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as TaskStatus })}>
                <SelectTrigger id="task-status" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                Mức ưu tiên
              </Label>
              <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value as TaskPriority })}>
                <SelectTrigger id="task-priority" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <Flag className="h-3.5 w-3.5 shrink-0" style={{ color: option.color }} />
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Người phụ trách
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="h-10 w-full justify-between font-normal">
                  <span className="truncate">
                    {selectedAssignees.length === 0
                      ? "Chưa giao"
                      : selectedAssignees.map((member) => member.name ?? member.email).join(", ")}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-72 w-72 overflow-y-auto">
                {projectMembers.map((member) => (
                  <DropdownMenuCheckboxItem
                    key={member.id}
                    checked={form.assigneeIds?.includes(member.id)}
                    onCheckedChange={() => toggleAssignee(member.id)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    <span className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.avatar || undefined} />
                        <AvatarFallback className="text-[10px] font-medium">
                          {getInitials(member.name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      {member.name ?? member.email}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-start" className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                Ngày bắt đầu
              </Label>
              <TaskDateTimePicker
                id="task-start"
                value={form.startDate}
                onChange={(value) => setForm({ ...form, startDate: value })}
                placeholder="Chọn ngày bắt đầu"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due" className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                Ngày kết thúc
              </Label>
              <TaskDateTimePicker
                id="task-due"
                value={form.dueDate}
                onChange={(value) => setForm({ ...form, dueDate: value })}
                placeholder="Chọn ngày kết thúc"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 px-6 pb-6 pt-2 sm:gap-2">
          <Button variant="ghost" onClick={handleClose} className="h-10">
            Hủy
          </Button>
          <Button variant="outline" onClick={() => handleSubmit(false)} disabled={isSubmitting} className="h-10 gap-1.5">
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Tạo thêm
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={isSubmitting} className="h-10 gap-1.5 bg-primary hover:bg-primary/90">
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
