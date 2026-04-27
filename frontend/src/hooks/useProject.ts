import { useQuery } from "@tanstack/react-query"

import { getProjectDetail } from "@/lib/project-api"

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
