import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createComment,
  createSubTask,
  createTask,
  deleteAttachment,
  deleteComment,
  deleteTask,
  getTaskDetail,
  getTasks,
  toggleSubTask,
  updateTask,
  updateTaskStatus,
  uploadAttachment,
} from "@/lib/task-api"
import { taskQueryKeys } from "@/lib/query-client"
import type {
  CreateTaskPayload,
  TaskFilter,
  UpdateTaskPayload,
} from "@/types/task"

export const useTasksQuery = (projectId: number, filters?: TaskFilter) =>
  useQuery({
    queryKey: taskQueryKeys.list(projectId, filters),
    queryFn: () => getTasks(projectId, filters),
  })

export const useTaskDetailQuery = (taskId: number | null) =>
  useQuery({
    queryKey: taskQueryKeys.detail(taskId ?? 0),
    queryFn: () => getTaskDetail(taskId!),
    enabled: taskId !== null && taskId > 0,
  })

export const useCreateTaskMutation = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
    },
  })
}

export const useUpdateTaskMutation = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: number
      payload: UpdateTaskPayload
    }) => updateTask(taskId, payload),
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
    },
  })
}

export const useDeleteTaskMutation = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
    },
  })
}

export const useUpdateTaskStatusMutation = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: string }) =>
      updateTaskStatus(taskId, status),
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
    },
  })
}

export const useCreateSubTaskMutation = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: number
      payload: CreateTaskPayload
    }) => createSubTask(taskId, payload),
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
    },
  })
}

export const useToggleSubTaskMutation = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, completed }: { taskId: number; completed: boolean }) =>
      toggleSubTask(taskId, completed),
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
    },
  })
}

export const useCreateCommentMutation = (taskId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => createComment(taskId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
    },
  })
}

export const useDeleteCommentMutation = (taskId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
    },
  })
}

export const useUploadAttachmentMutation = (taskId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadAttachment(taskId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
    },
  })
}

export const useDeleteAttachmentMutation = (taskId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: number) => deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
    },
  })
}
