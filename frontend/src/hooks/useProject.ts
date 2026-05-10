import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getProjectDetail, updateProject, type UpdateProjectPayload } from "@/lib/project-api"

export const projectQueryKeys = {
  detail: (workspaceId: string | number, projectId: number) =>
    ["project", String(workspaceId), projectId] as const,
}

export const useProjectDetailQuery = (workspaceId: string | number, projectId: number) =>
  useQuery({
    queryKey: projectQueryKeys.detail(workspaceId, projectId),
    queryFn: () => getProjectDetail(workspaceId, projectId),
    enabled: Boolean(workspaceId) && projectId > 0,
  })

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
