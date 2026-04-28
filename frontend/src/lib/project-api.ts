import apiClient from "./api-client"

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
