import type { WorkspaceRole } from "@/types/workspace"

export const workspaceRoleVariantMap: Record<WorkspaceRole, "default" | "secondary" | "outline"> = {
  OWNER: "default",
  MEMBER: "secondary",
  GUEST: "outline",
}

const workspaceRoleLabelMap = {
  OWNER: {
    short: "Admin",
    full: "Quản trị viên",
  },
  MEMBER: {
    short: "Thành viên",
    full: "Thành viên",
  },
  GUEST: {
    short: "Khách",
    full: "Khách cộng tác",
  },
} as const satisfies Record<WorkspaceRole, { short: string; full: string }>

export function getWorkspaceRoleLabel(role: WorkspaceRole, tone: "short" | "full" = "short") {
  return workspaceRoleLabelMap[role][tone]
}
