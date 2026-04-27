import { useQuery } from "@tanstack/react-query"

import { getProjectDetail } from "@/lib/project-api"

export const projectQueryKeys = {
  detail: (workspaceId: number, projectId: number) =>
    ["project", workspaceId, projectId] as const,
}

export const useProjectDetailQuery = (workspaceId: number, projectId: number) =>
  useQuery({
    queryKey: projectQueryKeys.detail(workspaceId, projectId),
    queryFn: () => getProjectDetail(workspaceId, projectId),
    enabled: workspaceId > 0 && projectId > 0,
  })
