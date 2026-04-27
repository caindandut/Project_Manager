import { useQuery } from "@tanstack/react-query"

import { getProjects } from "@/lib/projects-api"

export const projectQueryKeys = {
  list: (workspaceId: number) => ["projects", workspaceId] as const,
  detail: (workspaceId: number, projectId: number) =>
    ["project", workspaceId, projectId] as const,
}

export const useProjectsQuery = (workspaceId: number) =>
  useQuery({
    queryKey: projectQueryKeys.list(workspaceId),
    queryFn: () => getProjects(workspaceId, 1, 50),
    enabled: workspaceId > 0,
  })
