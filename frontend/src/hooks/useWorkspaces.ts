import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  cancelWorkspaceInvitation,
  createWorkspace,
  deleteWorkspace,
  getWorkspaceDetail,
  getWorkspaceMembers,
  getWorkspacePendingInvitations,
  getWorkspaces,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspace,
  updateWorkspaceMemberRole,
} from "@/lib/workspace-api"
import type {
  CreateWorkspacePayload,
  InviteWorkspaceMemberPayload,
  UpdateWorkspacePayload,
  UpdateWorkspaceMemberRolePayload,
  WorkspaceRole,
} from "@/types/workspace"

export const workspaceQueryKeys = {
  list: (page: number, limit: number) => ["workspaces", page, limit] as const,
  detail: (workspaceId: string | number) => ["workspace", String(workspaceId)] as const,
  members: (workspaceId: string | number, page: number, limit: number, role?: WorkspaceRole) =>
    ["workspace-members", String(workspaceId), page, limit, role ?? "ALL"] as const,
  invitations: (workspaceId: string | number) => ["workspace-invitations", String(workspaceId)] as const,
}

export const useWorkspacesQuery = (page: number, limit: number, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: workspaceQueryKeys.list(page, limit),
    queryFn: () => getWorkspaces(page, limit),
    enabled: options?.enabled ?? true,
  })

export const useWorkspaceDetailQuery = (workspaceId: string | number) =>
  useQuery({
    queryKey: workspaceQueryKeys.detail(workspaceId),
    queryFn: () => getWorkspaceDetail(workspaceId),
    enabled: Boolean(workspaceId),
  })

export const useWorkspaceMembersQuery = (
  workspaceId: string | number,
  page: number,
  limit: number,
  role?: WorkspaceRole,
) =>
  useQuery({
    queryKey: workspaceQueryKeys.members(workspaceId, page, limit, role),
    queryFn: () => getWorkspaceMembers({ workspaceId, page, limit, role }),
    enabled: Boolean(workspaceId),
  })

export const useWorkspacePendingInvitationsQuery = (workspaceId: string | number) =>
  useQuery({
    queryKey: workspaceQueryKeys.invitations(workspaceId),
    queryFn: () => getWorkspacePendingInvitations(workspaceId),
    enabled: Boolean(workspaceId),
  })

export const useUpdateWorkspaceMutation = (workspaceId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateWorkspacePayload) => updateWorkspace(workspaceId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.detail(workspaceId) })
    },
  })
}

export const useCancelWorkspaceInvitationMutation = (workspaceId: string | number) => {
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
  workspaceId: string | number,
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
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.invitations(workspaceId),
        }),
      ])
    },
  })
}

export const useUpdateWorkspaceMemberRoleMutation = (
  workspaceId: string | number,
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
  workspaceId: string | number,
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

export const useDeleteWorkspaceMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workspaceId: string | number) => deleteWorkspace(workspaceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}
