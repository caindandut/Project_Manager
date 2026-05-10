import apiClient, { unwrapResponse } from "./api-client"
import type { ApiResponse } from "@/types/api"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"

export async function downloadAttachment(attachmentId: number, fileName: string): Promise<void> {
  const token = localStorage.getItem("accessToken")
  if (!token) {
    throw new Error("Authentication required")
  }

  const url = `${API_BASE_URL}/attachments/${attachmentId}?download=true`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to download file")
  }

  const blob = await response.blob()
  const blobUrl = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = blobUrl
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(blobUrl)
  document.body.removeChild(a)
}

export interface Project {
  id: number
  name: string
  key: string
  description?: string
  slug: string
  workspaceId: number
  createdAt: string
  updatedAt: string
  owner?: {
    id: number
    name: string | null
    email: string
    avatar: string | null
  }
  stats?: ProjectStats
  recentTasks?: RecentTask[]
  recentActivities?: ProjectActivity[]
}

export interface ProjectStats {
  totalTasks: number
  assignedTasks: number
  completedTasks: number
  todoCount: number
  inProgressCount: number
  doneCount: number
  // New fields from enriched backend
  todoTasks: number
  inProgressTasks: number
  reviewTasks: number
  doneTasks: number
  cancelledTasks: number
  overdueTasks: number
  memberCount: number
  subtaskCount: number
  // Priority breakdown
  lowestPriorityTasks: number
  lowPriorityTasks: number
  mediumPriorityTasks: number
  highPriorityTasks: number
  highestPriorityTasks: number
}

export interface RecentTask {
  id: number
  title: string
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED"
  priority: "LOWEST" | "LOW" | "MEDIUM" | "HIGH" | "HIGHEST"
  dueDate?: string | null
  createdAt: string
  updatedAt?: string
  assignee?: {
    id: number
    name?: string | null
    email: string
    avatar?: string | null
  } | null
  projectId?: number
  project?: {
    id: number
    name: string
  }
}

export interface ProjectActivity {
  id: number
  action: string
  entityType: string
  entityId: number
  metadata?: {
    field?: string
    oldValue?: string | null
    newValue?: string | null
    fileName?: string
    [key: string]: unknown
  } | null
  createdAt: string
  user: {
    id: number
    name: string | null
    avatar: string | null
  }
  task: {
    id: number
    title: string
  } | null
}

// Keep old Task alias for backward compatibility
export type Task = RecentTask

export async function getProjectDetail(workspaceId: string | number, projectId: number): Promise<Project> {
  const response = await apiClient.get<ApiResponse<Project>>(
    `/workspaces/${workspaceId}/projects/${projectId}`
  )
  return unwrapResponse(response)
}

export interface UpdateProjectPayload {
  name?: string
  description?: string
  key?: string
  color?: string
}

export async function updateProject(
  workspaceId: string | number,
  projectId: number,
  payload: UpdateProjectPayload
): Promise<Project> {
  const response = await apiClient.patch<ApiResponse<Project>>(
    `/workspaces/${workspaceId}/projects/${projectId}`,
    payload
  )
  return unwrapResponse(response)
}
