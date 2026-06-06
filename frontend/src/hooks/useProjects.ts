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
