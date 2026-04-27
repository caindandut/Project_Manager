import type { AxiosResponse } from "axios"

import apiClient, { normalizeApiError, unwrapResponse } from "@/lib/api-client"
import type { ApiResponse, PaginatedMeta, PaginatedResponse } from "@/types/api"
import type {
  CreateWorkspacePayload,
  InviteWorkspaceMemberPayload,
  PaginatedWorkspaceResult,
  PendingInvitation,
  UpdateWorkspaceMemberRolePayload,
  WorkspaceDetail,
  WorkspaceListItem,
  WorkspaceMember,
  WorkspaceRole,
} from "@/types/workspace"

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20

const ensurePaginatedResult = <T>(
  response: AxiosResponse<PaginatedResponse<T>>,
  fallbackPage = DEFAULT_PAGE,
  fallbackLimit = DEFAULT_LIMIT,
): PaginatedWorkspaceResult<T> => {
  if (!response.data.success || response.data.data === undefined) {
    throw new Error(response.data.error?.message || "Yêu cầu không thành công.")
  }

  const meta = response.data.meta ?? {
    page: fallbackPage,
    limit: fallbackLimit,
    total: response.data.data.length,
    totalPages: 1,
  }

  return {
    data: response.data.data,
    meta,
  }
}

export const getWorkspaces = async (
  page = DEFAULT_PAGE,
  limit = 6,
): Promise<PaginatedWorkspaceResult<WorkspaceListItem>> => {
  try {
    const response = await apiClient.get<PaginatedResponse<WorkspaceListItem>>("/workspaces", {
      params: { page, limit },
    })

    return ensurePaginatedResult(response, page, limit)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const createWorkspace = async (payload: CreateWorkspacePayload) => {
  try {
    const response = await apiClient.post<ApiResponse<WorkspaceListItem>>("/workspaces", payload)
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const getWorkspaceDetail = async (workspaceId: number) => {
  try {
    const response = await apiClient.get<ApiResponse<WorkspaceDetail>>(`/workspaces/${workspaceId}`)
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const getWorkspaceMembers = async ({
  workspaceId,
  page = DEFAULT_PAGE,
  limit = 50,
  role,
}: {
  workspaceId: number
  page?: number
  limit?: number
  role?: WorkspaceRole
}): Promise<PaginatedWorkspaceResult<WorkspaceMember>> => {
  try {
    const response = await apiClient.get<PaginatedResponse<WorkspaceMember>>(
      `/workspaces/${workspaceId}/members`,
      {
        params: { page, limit, role },
      },
    )

    return ensurePaginatedResult(response, page, limit)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const inviteWorkspaceMember = async (
  workspaceId: number,
  payload: InviteWorkspaceMemberPayload,
) => {
  try {
    const response = await apiClient.post<ApiResponse<WorkspaceMember>>(
      `/workspaces/${workspaceId}/members`,
      payload,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const updateWorkspaceMemberRole = async (
  workspaceId: number,
  memberId: number,
  payload: UpdateWorkspaceMemberRolePayload,
) => {
  try {
    const response = await apiClient.patch<ApiResponse<{ id: number; role: WorkspaceRole; updatedAt: string }>>(
      `/workspaces/${workspaceId}/members/${memberId}`,
      payload,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const removeWorkspaceMember = async (workspaceId: number, memberId: number) => {
  try {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/workspaces/${workspaceId}/members/${memberId}`,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const getWorkspacePendingInvitations = async (workspaceId: number) => {
  try {
    const response = await apiClient.get<ApiResponse<PendingInvitation[]>>(
      `/workspaces/${workspaceId}/invitations`,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const cancelWorkspaceInvitation = async (workspaceId: number, invitationId: number) => {
  try {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/workspaces/${workspaceId}/invitations/${invitationId}`,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const emptyPaginatedMeta = (page = DEFAULT_PAGE, limit = DEFAULT_LIMIT): PaginatedMeta => ({
  page,
  limit,
  total: 0,
  totalPages: 0,
})
