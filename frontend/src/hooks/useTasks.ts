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
import { myTasksQueryKeys, taskQueryKeys } from "@/lib/query-client"
import type {
  CreateTaskPayload,
  TaskDetail,
  TaskFilter,
  UpdateTaskPayload,
} from "@/types/task"
import { useRealtimeStore } from "@/lib/realtime"

const invalidateProjectOverviewQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["project"] })
}

export const useTasksQuery = (projectId: number, filters?: TaskFilter) =>
  useQuery({
    queryKey: taskQueryKeys.list(projectId, filters as Record<string, unknown> | undefined),
    queryFn: () => getTasks(projectId, filters),
  })

export const useTaskDetailQuery = (taskId: number | null) => {
  const isRealtimeConnected = useRealtimeStore((state) => state.isConnected)

  return useQuery({
    queryKey: taskQueryKeys.detail(taskId ?? 0),
    queryFn: () => getTaskDetail(taskId!),
    enabled: taskId !== null && taskId > 0,
    refetchInterval: !isRealtimeConnected && taskId !== null && taskId > 0 ? 3_000 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  })
}

export const useCreateTaskMutation = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(projectId, payload),
    onSuccess: () => {
      invalidateProjectOverviewQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
      queryClient.invalidateQueries({ queryKey: myTasksQueryKeys.all })
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
    onSuccess: (data, { taskId }) => {
      queryClient.setQueryData<TaskDetail>(taskQueryKeys.detail(taskId), (current) =>
        current ? { ...current, ...data } : current,
      )
      invalidateProjectOverviewQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
      queryClient.invalidateQueries({ queryKey: myTasksQueryKeys.all })
    },
  })
}

export const useDeleteTaskMutation = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: () => {
      invalidateProjectOverviewQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
      queryClient.invalidateQueries({ queryKey: myTasksQueryKeys.all })
    },
  })
}

export const useUpdateTaskStatusMutation = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: string }) =>
      updateTaskStatus(taskId, status),
    onSuccess: (_data, { taskId }) => {
      invalidateProjectOverviewQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
      queryClient.invalidateQueries({ queryKey: myTasksQueryKeys.all })
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
      invalidateProjectOverviewQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
      queryClient.invalidateQueries({ queryKey: myTasksQueryKeys.all })
    },
  })
}

export const useToggleSubTaskMutation = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, completed }: { taskId: number; completed: boolean }) =>
      toggleSubTask(taskId, completed),
    onSuccess: (_data, { taskId }) => {
      invalidateProjectOverviewQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
      queryClient.invalidateQueries({ queryKey: myTasksQueryKeys.all })
    },
  })
}

export const useCreateCommentMutation = (taskId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => createComment(taskId, content),
    onSuccess: () => {
      invalidateProjectOverviewQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: myTasksQueryKeys.all })
    },
  })
}

export const useDeleteCommentMutation = (taskId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onSuccess: () => {
      invalidateProjectOverviewQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: myTasksQueryKeys.all })
    },
  })
}

export const useUploadAttachmentMutation = (taskId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadAttachment(taskId, file),
    onSuccess: () => {
      invalidateProjectOverviewQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: myTasksQueryKeys.all })
    },
  })
}

export const useDeleteAttachmentMutation = (taskId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: number) => deleteAttachment(attachmentId),
    onSuccess: () => {
      invalidateProjectOverviewQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: myTasksQueryKeys.all })
    },
  })
}
