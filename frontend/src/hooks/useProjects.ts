import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getProjects, createProject, type CreateProjectPayload } from "@/lib/projects-api"

export const projectQueryKeys = {
  list: (workspaceId: string | number) => ["projects", String(workspaceId)] as const,
  detail: (workspaceId: string | number, projectId: number) =>
    ["project", String(workspaceId), projectId] as const,
}

export const useProjectsQuery = (workspaceId: string | number) =>
  useQuery({
    queryKey: projectQueryKeys.list(workspaceId),
    queryFn: () => getProjects(workspaceId, 1, 50),
    enabled: Boolean(workspaceId),
  })

export const useCreateProjectMutation = (workspaceId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => createProject(workspaceId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.list(workspaceId) })
    },
  })
}

export interface MyTask {
  id: number
  title: string
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED"
  project?: {
    id: number
    name: string
  }
}

export interface MyTasksResult {
  data: MyTask[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const useMyTasksQuery = (workspaceId: string | number, page: number, limit: number) =>
  useQuery({
    queryKey: ["my-tasks", String(workspaceId), page, limit] as const,
    queryFn: async (): Promise<MyTasksResult> => {
      const api = (await import("@/lib/api-client")).default
      const response = await api.get(`/workspaces/${workspaceId}/my-tasks?page=${page}&limit=${limit}`)
      return response.data
    },
    enabled: Boolean(workspaceId),
  })
