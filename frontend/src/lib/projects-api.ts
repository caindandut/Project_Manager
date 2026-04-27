import apiClient from "./api-client"
import type { Project, ProjectWithStats, Task } from "@/types/project"

export interface ProjectListResponse {
  data: Project[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ProjectDetailResponse extends ProjectWithStats {
  recentTasks?: Task[]
}

export async function getProjects(workspaceId: number, page = 1, limit = 20): Promise<ProjectListResponse> {
  const response = await apiClient.get<ProjectListResponse>(
    `/workspaces/${workspaceId}/projects`,
    { params: { page, limit } }
  )
  return response.data
}

export async function getProjectDetail(
  workspaceId: number,
  projectId: number
): Promise<ProjectDetailResponse> {
  const response = await apiClient.get<ProjectDetailResponse>(
    `/workspaces/${workspaceId}/projects/${projectId}`
  )
  return response.data
}

export async function getMyTasks(
  workspaceId: number,
  page = 1,
  limit = 20
): Promise<{ data: Task[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const response = await apiClient.get(`/workspaces/${workspaceId}/tasks/me`, {
    params: { page, limit },
  })
  return response.data
}
