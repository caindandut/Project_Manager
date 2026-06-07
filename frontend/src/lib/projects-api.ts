import apiClient, { unwrapResponse } from "./api-client"
import type { ApiResponse, PaginatedResponse } from "@/types/api"
import type { Project, ProjectWithStats, Task } from "@/types/project"

export interface ProjectListResponse {
  data: Project[]
  meta: {
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
  const response = await apiClient.get<PaginatedResponse<Project>>(
    `/workspaces/${workspaceId}/projects`,
    { params: { page, limit } }
  )
  const projects = unwrapResponse(response)

  return {
    data: projects,
    meta: response.data.meta ?? {
      page,
      limit,
      total: projects.length,
      totalPages: 0,
    },
  }
}

export async function getProjectDetail(
  workspaceId: string | number,
  projectId: number
): Promise<ProjectDetailResponse> {
  const response = await apiClient.get<ApiResponse<ProjectDetailResponse>>(
    `/workspaces/${workspaceId}/projects/${projectId}`
  )
  return unwrapResponse(response)
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
  const response = await apiClient.post<ApiResponse<Project>>(
    `/workspaces/${workspaceId}/projects`,
    payload
  )
  return unwrapResponse(response)
}
