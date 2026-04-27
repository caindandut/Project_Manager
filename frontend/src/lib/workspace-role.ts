import type { WorkspaceRole } from "@/types/workspace"

export const workspaceRoleVariantMap: Record<WorkspaceRole, "default" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "default",
  MEMBER: "secondary",
  GUEST: "outline",
}

const workspaceRoleLabelMap = {
  OWNER: {
    short: "Admin",
    full: "Quản trị viên",
  },
  ADMIN: {
    short: "Admin",
    full: "Quản trị viên",
  },
  MEMBER: {
    short: "Member",
    full: "Thành viên",
  },
  GUEST: {
    short: "Guest",
    full: "Khách cộng tác",
  },
} as const satisfies Record<WorkspaceRole, { short: string; full: string }>

export function getWorkspaceRoleLabel(role: WorkspaceRole, tone: "short" | "full" = "short") {
  return workspaceRoleLabelMap[role][tone]
}
