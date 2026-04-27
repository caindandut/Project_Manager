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

export async function getProjects(workspaceId: string | number, page = 1, limit = 20): Promise<ProjectListResponse> {
  const response = await apiClient.get<ProjectListResponse>(
    `/workspaces/${workspaceId}/projects`,
    { params: { page, limit } }
  )
  return response.data
}

export async function getProjectDetail(
  workspaceId: string | number,
  projectId: number
): Promise<ProjectDetailResponse> {
  const response = await apiClient.get<ProjectDetailResponse>(
    `/workspaces/${workspaceId}/projects/${projectId}`
  )
  return response.data
}

export async function getMyTasks(
  workspaceId: string | number,
  page = 1,
  limit = 20
): Promise<{ data: Task[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const response = await apiClient.get(`/workspaces/${workspaceId}/tasks/me`, {
    params: { page, limit },
  })
  return response.data
}

export interface CreateProjectPayload {
  name: string
  key: string
  description?: string
}

export async function createProject(
  workspaceId: string | number,
  payload: CreateProjectPayload
): Promise<Project> {
  const response = await apiClient.post<Project>(
    `/workspaces/${workspaceId}/projects`,
    payload
  )
  return response.data
}
