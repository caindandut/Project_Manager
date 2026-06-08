import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getProjectDetail, updateProject, deleteProject, getArchivedProjects, restoreProject, type UpdateProjectPayload } from "@/lib/project-api"
import { useRealtimeStore } from "@/lib/realtime"

export const projectQueryKeys = {
  detail: (workspaceId: string | number, projectId: number) =>
    ["project", String(workspaceId), projectId] as const,
  archived: (workspaceId: string | number) =>
    ["projects-archived", String(workspaceId)] as const,
}

export const useProjectDetailQuery = (workspaceId: string | number, projectId: number) => {
  const isRealtimeConnected = useRealtimeStore((state) => state.isConnected)

  return useQuery({
    queryKey: projectQueryKeys.detail(workspaceId, projectId),
    queryFn: () => getProjectDetail(workspaceId, projectId),
    enabled: Boolean(workspaceId) && projectId > 0,
    refetchInterval: !isRealtimeConnected && Boolean(workspaceId) && projectId > 0 ? 3_000 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  })
}

export const useUpdateProjectMutation = (workspaceId: string | number, projectId: number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateProjectPayload) => updateProject(workspaceId, projectId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.detail(workspaceId, projectId),
        }),
        // Also invalidate the projects list so the sidebar updates
        queryClient.invalidateQueries({
          queryKey: ["projects", String(workspaceId)],
        }),
      ])
    },
  })
}

export const useDeleteProjectMutation = (workspaceId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: number) => deleteProject(workspaceId, projectId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["projects", String(workspaceId)],
        }),
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.archived(workspaceId),
        }),
      ])
    },
  })
}

export const useArchivedProjectsQuery = (workspaceId: string | number) =>
  useQuery({
    queryKey: projectQueryKeys.archived(workspaceId),
    queryFn: () => getArchivedProjects(workspaceId),
    enabled: Boolean(workspaceId),
  })

export const useRestoreProjectMutation = (workspaceId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: number) => restoreProject(workspaceId, projectId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["projects", String(workspaceId)],
        }),
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.archived(workspaceId),
        }),
      ])
    },
  })
}
