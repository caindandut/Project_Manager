import type { PaginatedMeta } from "@/types/api"

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST"

export interface WorkspaceListItem {
  id: number
  name: string
  slug: string
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
  todoCount?: number
  inProgressCount?: number
  doneCount?: number
}

export interface RecentTask {
  id: number
  title: string
  status: string
  assignee?: {
    name: string | null
    email: string
  } | null
  updatedAt?: string
}

export interface WorkspaceDetail {
  id: number
  name: string
  slug: string
  description: string | null
  logo: string | null
  role: WorkspaceRole
  createdAt: string
  updatedAt: string
  stats: WorkspaceStats
  recentTasks?: RecentTask[]
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

export interface UpdateWorkspacePayload {
  name?: string
  description?: string
  logo?: string
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
  token: string
  email: string
  role: Exclude<WorkspaceRole, "OWNER">
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED"
  workspace?: {
    id: number
    name: string
    slug: string
  }
  invitedBy: PendingInvitationUser
  invitedAt: string
  expiresAt: string
}
