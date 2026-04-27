export interface Project {
  id: number
  name: string
  description?: string
  slug: string
  workspaceId: number
  createdAt: string
  updatedAt: string
}

export interface ProjectStats {
  totalTasks: number
  assignedTasks: number
  completedTasks: number
  todoCount: number
  inProgressCount: number
  doneCount: number
}

export interface ProjectWithStats extends Project {
  stats?: ProjectStats
}

export interface Task {
  id: number
  title: string
  description?: string
  status: TaskStatus
  priority?: TaskPriority
  assignee?: UserBasic
  projectId: number
  project?: {
    id: number
    name: string
  }
  dueDate?: string
  createdAt: string
  updatedAt: string
}

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED"
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

export interface UserBasic {
  id: number
  name?: string
  email: string
  avatar?: string
}
