import type { PaginatedMeta } from "@/types/api"

export type WorkspaceRole = "OWNER" | "MEMBER" | "GUEST"

export interface WorkspaceListItem {
  id: number
  name: string
  description: string | null
  logo: string | null
  role: WorkspaceRole
  memberCount: number
  projectCount: number
  createdAt: string
  updatedAt: string
}

export interface WorkspaceStats {
  memberCount: number
  projectCount: number
  taskCount: number
}

export interface WorkspaceDetail {
  id: number
  name: string
  description: string | null
  logo: string | null
  role: WorkspaceRole
  createdAt: string
  updatedAt: string
  stats: WorkspaceStats
}

export interface WorkspaceMemberUser {
  id: number
  name: string | null
  email: string
  avatar: string | null
}

export interface WorkspaceMember {
  id: number
  user: WorkspaceMemberUser
  role: WorkspaceRole
  joinedAt: string
}

export interface CreateWorkspacePayload {
  name: string
  description?: string
}

export interface InviteWorkspaceMemberPayload {
  email: string
  role: Exclude<WorkspaceRole, "OWNER">
}

export interface UpdateWorkspaceMemberRolePayload {
  role: Exclude<WorkspaceRole, "OWNER">
}

export interface PaginatedWorkspaceResult<T> {
  data: T[]
  meta: PaginatedMeta
}

export interface PendingInvitationUser {
  id: number
  name: string | null
  email: string
  avatar: string | null
}

export interface PendingInvitation {
  id: number
  email: string
  role: Exclude<WorkspaceRole, "OWNER">
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED"
  invitedBy: PendingInvitationUser
  invitedAt: string
  expiresAt: string
}
