import apiClient, { normalizeApiError, unwrapResponse } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api"
import type {
  CreateTaskPayload,
  TaskAttachment,
  TaskComment,
  TaskDetail,
  TaskFilter,
  UpdateTaskPayload,
} from "@/types/task"

export interface TaskListResponse {
  success: boolean
  data: TaskDetail[]
  meta?: {
    total?: number
    hasMore?: boolean
    cursor?: string
  }
}

export async function getTasks(
  projectId: number,
  filters?: TaskFilter,
): Promise<TaskListResponse> {
  try {
    const response = await apiClient.get<TaskListResponse>(
      `/projects/${projectId}/tasks`,
      {
        params: {
          ...filters,
          limit: 100,
        },
      },
    )
    return response.data
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function getTaskDetail(taskId: number): Promise<TaskDetail> {
  try {
    const response = await apiClient.get<ApiResponse<TaskDetail>>(
      `/tasks/${taskId}`,
      {
        params: {
          includeSubTasks: true,
          includeComments: true,
          includeAttachments: true,
          includeActivities: true,
          commentLimit: 50,
        },
      },
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function createTask(
  projectId: number,
  payload: CreateTaskPayload,
): Promise<TaskDetail> {
  try {
    const response = await apiClient.post<ApiResponse<TaskDetail>>(
      `/projects/${projectId}/tasks`,
      payload,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function updateTask(
  taskId: number,
  payload: UpdateTaskPayload,
): Promise<TaskDetail> {
  try {
    const response = await apiClient.patch<ApiResponse<TaskDetail>>(
      `/tasks/${taskId}`,
      payload,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function deleteTask(taskId: number): Promise<{ message: string }> {
  try {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/tasks/${taskId}`,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function createSubTask(
  taskId: number,
  payload: CreateTaskPayload,
): Promise<TaskDetail> {
  try {
    const response = await apiClient.post<ApiResponse<TaskDetail>>(
      `/tasks/${taskId}/subtasks`,
      payload,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function updateTaskStatus(
  taskId: number,
  status: string,
): Promise<TaskDetail> {
  try {
    const response = await apiClient.patch<ApiResponse<TaskDetail>>(
      `/tasks/${taskId}/status`,
      { status },
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function createComment(
  taskId: number,
  content: string,
): Promise<TaskComment> {
  try {
    const response = await apiClient.post<ApiResponse<TaskComment>>(
      `/tasks/${taskId}/comments`,
      { content },
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function deleteComment(commentId: number): Promise<{ message: string }> {
  try {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/comments/${commentId}`,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function uploadAttachment(
  taskId: number,
  file: File,
): Promise<TaskAttachment> {
  try {
    const formData = new FormData()
    formData.append("file", file)

    const response = await apiClient.post<ApiResponse<TaskAttachment>>(
      `/tasks/${taskId}/attachments`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function deleteAttachment(
  attachmentId: number,
): Promise<{ message: string }> {
  try {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/attachments/${attachmentId}`,
    )
    return unwrapResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function toggleSubTask(taskId: number, completed: boolean): Promise<void> {
  try {
    await apiClient.patch<ApiResponse<unknown>>(`/tasks/${taskId}`, {
      status: completed ? "DONE" : "TODO",
    })
  } catch (error) {
    throw normalizeApiError(error)
  }
}
