import apiClient, { normalizeApiError, unwrapResponse } from "@/lib/api-client"
import type { ApiResponse, PaginatedMeta } from "@/types/api"

// ============================================================
// Types
// ============================================================

export type ProjectRole = "ADMIN" | "MEMBER" | "GUEST"

export interface ProjectMember {
  id: number
  user: {
    id: number
    name: string
    email: string
    avatar: string | null
  }
  role: ProjectRole
  joinedAt: string
}

export interface ProjectMemberListResponse {
  data: ProjectMember[]
  meta: PaginatedMeta
}

export interface AddProjectMemberPayload {
  userId: number
  role?: "MEMBER" | "GUEST"
}

export interface UpdateProjectMemberRolePayload {
  role: "MEMBER" | "GUEST"
}

// ============================================================
// API functions
// ============================================================

export const getProjectMembers = async (
  projectId: number,
  page = 1,
  limit = 50,
): Promise<ProjectMemberListResponse> => {
  try {
    const response = await apiClient.get<ApiResponse<ProjectMember[]> & { meta?: PaginatedMeta }>(
      `/projects/${projectId}/members`,
      { params: { page, limit } },
    )

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || "Failed to fetch members")
    }

    return {
      data: response.data.data,
      meta: response.data.meta ?? { page, limit, total: response.data.data.length, totalPages: 1 },
    }
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const addProjectMember = async (
  projectId: number,
  payload: AddProjectMemberPayload,
): Promise<ProjectMember> => {
  try {
    const response = await apiClient.post<ApiResponse<ProjectMember>>(
      `/projects/${projectId}/members`,
      payload,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const updateProjectMemberRole = async (
  projectId: number,
  memberId: number,
  payload: UpdateProjectMemberRolePayload,
): Promise<{ id: number; role: ProjectRole; updatedAt: string }> => {
  try {
    const response = await apiClient.patch<
      ApiResponse<{ id: number; role: ProjectRole; updatedAt: string }>
    >(`/projects/${projectId}/members/${memberId}`, payload)
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const removeProjectMember = async (
  projectId: number,
  memberId: number,
): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/projects/${projectId}/members/${memberId}`,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}
