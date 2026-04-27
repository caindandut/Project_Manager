import { useState } from "react"
import { useParams } from "react-router-dom"

import InviteMemberDialog from "@/components/workspace/InviteMemberDialog"
import MemberTable from "@/components/workspace/MemberTable"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useWorkspaceDetailQuery, useWorkspaceMembersQuery } from "@/hooks/useWorkspaces"

const MEMBERS_PAGE_DEFAULT = 1
const MEMBERS_LIMIT = 20

export default function WorkspaceMembersSettings() {
  const params = useParams()
  const workspaceSlug = params.workspaceId || ""

  const { user } = useAuth()
  const [membersPage, setMembersPage] = useState(MEMBERS_PAGE_DEFAULT)

  const { data: workspace, isLoading: isLoadingWorkspace } = useWorkspaceDetailQuery(workspaceSlug)
  const {
    data: membersData,
    isLoading: isLoadingMembers,
  } = useWorkspaceMembersQuery(workspaceSlug, membersPage, MEMBERS_LIMIT)

  const canManage = workspace?.role === "OWNER" || workspace?.role === "ADMIN"

  if (isLoadingWorkspace) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-1 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Thành viên</h1>
          <p className="text-sm text-muted-foreground">
            {membersData?.meta.total
              ? `${membersData.meta.total} thành viên trong không gian làm việc`
              : "Quản lý thành viên trong không gian làm việc"}
          </p>
        </div>
        {canManage && (
          <InviteMemberDialog
            workspaceId={workspaceSlug}
            membersPage={membersPage}
            membersLimit={MEMBERS_LIMIT}
          />
        )}
      </div>

      {/* Members table */}
      <MemberTable
        workspaceId={workspaceSlug}
        members={membersData?.data ?? []}
        isLoading={isLoadingMembers}
        currentUserId={user?.id ?? null}
        canManage={canManage}
        membersPage={membersPage}
        membersLimit={MEMBERS_LIMIT}
      />

      {/* Pagination */}
      {membersData && membersData.meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent"
            disabled={membersPage <= 1}
            onClick={() => setMembersPage((p) => Math.max(1, p - 1))}
          >
            Trước
          </button>
          <span className="text-sm text-muted-foreground">
            Trang {membersPage} / {membersData.meta.totalPages}
          </span>
          <button
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent"
            disabled={membersPage >= membersData.meta.totalPages}
            onClick={() => setMembersPage((p) => p + 1)}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  )
}
