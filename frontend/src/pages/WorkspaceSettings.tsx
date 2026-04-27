import { useSearchParams } from "react-router-dom"

import WorkspaceGeneralSettings from "@/components/workspace/WorkspaceGeneralSettings"
import WorkspaceMembersSettings from "@/components/workspace/WorkspaceMembersSettings"
import WorkspaceSettingsLayout from "@/components/workspace/WorkspaceSettingsLayout"

type SettingsTab = "general" | "members"

export default function WorkspaceSettingsPage() {
  const [searchParams] = useSearchParams()
  const activeTab = (searchParams.get("tab") as SettingsTab) || "general"

  return (
    <WorkspaceSettingsLayout activeTab={activeTab}>
      {activeTab === "general" && <WorkspaceGeneralSettings />}
      {activeTab === "members" && <WorkspaceMembersSettings />}
    </WorkspaceSettingsLayout>
  )
}
