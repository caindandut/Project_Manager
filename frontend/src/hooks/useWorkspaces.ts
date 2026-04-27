import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  cancelWorkspaceInvitation,
  createWorkspace,
  getWorkspaceDetail,
  getWorkspaceMembers,
  getWorkspacePendingInvitations,
  getWorkspaces,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "@/lib/workspace-api"
import type {
  CreateWorkspacePayload,
  InviteWorkspaceMemberPayload,
  UpdateWorkspaceMemberRolePayload,
  WorkspaceRole,
} from "@/types/workspace"

export const workspaceQueryKeys = {
  list: (page: number, limit: number) => ["workspaces", page, limit] as const,
  detail: (workspaceId: number) => ["workspace", workspaceId] as const,
  members: (workspaceId: number, page: number, limit: number, role?: WorkspaceRole) =>
    ["workspace-members", workspaceId, page, limit, role ?? "ALL"] as const,
  invitations: (workspaceId: number) => ["workspace-invitations", workspaceId] as const,
}

export const useWorkspacesQuery = (page: number, limit: number) =>
  useQuery({
    queryKey: workspaceQueryKeys.list(page, limit),
    queryFn: () => getWorkspaces(page, limit),
  })

export const useWorkspaceDetailQuery = (workspaceId: number) =>
  useQuery({
    queryKey: workspaceQueryKeys.detail(workspaceId),
    queryFn: () => getWorkspaceDetail(workspaceId),
    enabled: workspaceId > 0,
  })

export const useWorkspaceMembersQuery = (
  workspaceId: number,
  page: number,
  limit: number,
  role?: WorkspaceRole,
) =>
  useQuery({
    queryKey: workspaceQueryKeys.members(workspaceId, page, limit, role),
    queryFn: () => getWorkspaceMembers({ workspaceId, page, limit, role }),
    enabled: workspaceId > 0,
  })

export const useWorkspacePendingInvitationsQuery = (workspaceId: number) =>
  useQuery({
    queryKey: workspaceQueryKeys.invitations(workspaceId),
    queryFn: () => getWorkspacePendingInvitations(workspaceId),
    enabled: workspaceId > 0,
  })

export const useCancelWorkspaceInvitationMutation = (workspaceId: number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: number) => cancelWorkspaceInvitation(workspaceId, invitationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.invitations(workspaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.detail(workspaceId),
        }),
      ])
    },
  })
}

export const useCreateWorkspaceMutation = (page: number, limit: number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateWorkspacePayload) => createWorkspace(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.list(page, limit) })
    },
  })
}

export const useInviteWorkspaceMemberMutation = (
  workspaceId: number,
  membersPage: number,
  membersLimit: number,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: InviteWorkspaceMemberPayload) => inviteWorkspaceMember(workspaceId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.detail(workspaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.members(workspaceId, membersPage, membersLimit),
        }),
      ])
    },
  })
}

export const useUpdateWorkspaceMemberRoleMutation = (
  workspaceId: number,
  membersPage: number,
  membersLimit: number,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      memberId,
      payload,
    }: {
      memberId: number
      payload: UpdateWorkspaceMemberRolePayload
    }) => updateWorkspaceMemberRole(workspaceId, memberId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.members(workspaceId, membersPage, membersLimit),
      })
    },
  })
}

export const useRemoveWorkspaceMemberMutation = (
  workspaceId: number,
  membersPage: number,
  membersLimit: number,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (memberId: number) => removeWorkspaceMember(workspaceId, memberId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.detail(workspaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.members(workspaceId, membersPage, membersLimit),
        }),
      ])
    },
  })
}
