import apiClient from "./api-client"

export interface Project {
  id: number
  name: string
  description?: string
  slug: string
  workspaceId: number
  createdAt: string
  updatedAt: string
  stats?: ProjectStats
  recentTasks?: Task[]
}

export interface ProjectStats {
  totalTasks: number
  assignedTasks: number
  completedTasks: number
  todoCount: number
  inProgressCount: number
  doneCount: number
}

export interface Task {
  id: number
  title: string
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED"
  assignee?: {
    id: number
    name?: string
    email: string
    avatar?: string
  }
  projectId?: number
  project?: {
    id: number
    name: string
  }
  updatedAt?: string
  createdAt: string
}

export async function getProjectDetail(workspaceId: string | number, projectId: number): Promise<Project> {
  const response = await apiClient.get<Project>(
    `/workspaces/${workspaceId}/projects/${projectId}`
  )
  return response.data
}
