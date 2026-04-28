export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED"
export type TaskPriority = "LOWEST" | "LOW" | "MEDIUM" | "HIGH" | "HIGHEST"
export type TaskType = "TASK" | "SUB_TASK"

export interface TaskUser {
  id: number
  name: string | null
  email: string
  avatar: string | null
}

export interface Task {
  id: number
  title: string
  description: string | null
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  startDate: string | null
  dueDate: string | null
  estimatedHours: number | null
  loggedHours: number
  order: number
  projectId: number
  assigneeId: number | null
  parentId: number | null
  createdAt: string
  updatedAt: string
  assignee: TaskUser | null
  subTaskCount?: number
  commentCount?: number
  _count?: { subTasks: number; comments: number }
}

export interface TaskDetail extends Task {
  project: { id: number; name: string; key: string; workspaceId: number }
  parent: Pick<Task, "id" | "title" | "status"> | null
  subTasks: SubTask[]
  comments: TaskComment[]
  attachments: TaskAttachment[]
  activities: ActivityLog[]
}

export interface SubTask {
  id: number
  title: string
  status: TaskStatus
  priority: TaskPriority
  createdAt: string
}

export interface TaskComment {
  id: number
  content: string
  createdAt: string
  updatedAt: string
  user: Pick<TaskUser, "id" | "name" | "email" | "avatar">
}

export interface TaskAttachment {
  id: number
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  uploadedBy: Pick<TaskUser, "id" | "name" | "avatar">
}

export interface ActivityLog {
  id: number
  action: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
  user: Pick<TaskUser, "id" | "name" | "email" | "avatar">
  metadata?: Record<string, unknown> | null
}

export interface TaskFilter {
  status?: string
  priority?: string
  assigneeId?: number
  titleContains?: string
}

export interface CreateTaskPayload {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  startDate?: string
  dueDate?: string
  estimatedHours?: number
  assigneeId?: number
}

export interface UpdateTaskPayload {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  startDate?: string | null
  dueDate?: string | null
  estimatedHours?: number
  assigneeId?: number | null
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Việc cần làm",
  IN_PROGRESS: "Đang tiến hành",
  REVIEW: "Xem xét",
  DONE: "Hoàn thành",
  CANCELLED: "Đã hủy",
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOWEST: "Thấp nhất",
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  HIGHEST: "Cao nhất",
}
