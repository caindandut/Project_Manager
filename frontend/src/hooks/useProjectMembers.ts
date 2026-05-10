import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
  type AddProjectMemberPayload,
  type UpdateProjectMemberRolePayload,
} from "@/lib/project-member-api"

export const projectMemberQueryKeys = {
  list: (projectId: number) => ["project-members", projectId] as const,
}

/**
 * Fetch and cache the project member list.
 */
export const useProjectMembersQuery = (projectId: number) =>
  useQuery({
    queryKey: projectMemberQueryKeys.list(projectId),
    queryFn: () => getProjectMembers(projectId),
    enabled: projectId > 0,
  })

/**
 * Add a member to a project.
 */
export const useAddProjectMemberMutation = (projectId: number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AddProjectMemberPayload) => addProjectMember(projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: projectMemberQueryKeys.list(projectId),
      })
    },
  })
}

/**
 * Update a project member's role.
 */
export const useUpdateProjectMemberRoleMutation = (projectId: number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      memberId,
      payload,
    }: {
      memberId: number
      payload: UpdateProjectMemberRolePayload
    }) => updateProjectMemberRole(projectId, memberId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: projectMemberQueryKeys.list(projectId),
      })
    },
  })
}

/**
 * Remove a project member.
 */
export const useRemoveProjectMemberMutation = (projectId: number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (memberId: number) => removeProjectMember(projectId, memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: projectMemberQueryKeys.list(projectId),
      })
    },
  })
}
