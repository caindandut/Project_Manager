import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, FolderKanban, ListChecks, ShieldCheck, Users } from "lucide-react"

import InviteMemberDialog from "@/components/workspace/InviteMemberDialog"
import MemberList from "@/components/workspace/MemberList"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useWorkspaceDetailQuery, useWorkspaceMembersQuery } from "@/hooks/useWorkspaces"
import { cn } from "@/lib/utils"
import { getWorkspaceRoleLabel, workspaceRoleVariantMap } from "@/lib/workspace-role"

const MEMBERS_PAGE = 1
const MEMBERS_LIMIT = 50

export default function WorkspaceDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const workspaceId = Number(params.workspaceId || "0")
  const workspaceQuery = useWorkspaceDetailQuery(workspaceId)
  const membersQuery = useWorkspaceMembersQuery(workspaceId, MEMBERS_PAGE, MEMBERS_LIMIT)
  const workspace = workspaceQuery.data
  const members = membersQuery.data?.data ?? []
  const canManageMembers = workspace?.role === "OWNER"

  useEffect(() => {
    document.title = workspace ? `${workspace.name} | Workspace` : "Chi tiết workspace | Project Manager"
  }, [workspace])

  if (!workspaceId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workspace không hợp lệ</CardTitle>
          <CardDescription>Vui lòng quay lại danh sách workspace và chọn lại một mục hợp lệ.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/workspaces" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Quay lại danh sách
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-md border border-border/80 bg-muted/40 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link to="/workspaces" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại danh sách</span>
            </Link>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                {workspace ? (
                  <Badge variant={workspaceRoleVariantMap[workspace.role]}>
                    {getWorkspaceRoleLabel(workspace.role)}
                  </Badge>
                ) : null}
                <Badge variant="secondary">Đang hoạt động</Badge>
                {workspace ? <Badge variant="outline">Workspace #{workspace.id}</Badge> : null}
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-foreground">
                {workspace?.name || "Chi tiết workspace"}
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-7 text-muted-foreground">
                {workspace?.description || "Theo dõi nhanh thông tin, thống kê và thành viên trong workspace."}
              </p>
            </div>
          </div>

          {canManageMembers ? (
            <div className="flex flex-wrap gap-3">
              <InviteMemberDialog
                workspaceId={workspaceId}
                membersPage={MEMBERS_PAGE}
                membersLimit={MEMBERS_LIMIT}
              />
            </div>
          ) : null}
        </div>
      </div>

      {workspaceQuery.isLoading ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card>
            <CardHeader className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {workspaceQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Không tải được workspace</CardTitle>
            <CardDescription>
              Workspace có thể không tồn tại hoặc bạn không có quyền truy cập vào không gian này.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void workspaceQuery.refetch()}>
              Thử tải lại
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!workspaceQuery.isLoading && !workspaceQuery.isError && workspace ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <CardDescription>Thành viên</CardDescription>
                  </div>
                  <CardTitle className="text-3xl">{workspace.stats.memberCount}</CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FolderKanban className="h-4 w-4" />
                    <CardDescription>Dự án</CardDescription>
                  </div>
                  <CardTitle className="text-3xl">{workspace.stats.projectCount}</CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ListChecks className="h-4 w-4" />
                    <CardDescription>Công việc</CardDescription>
                  </div>
                  <CardTitle className="text-3xl">{workspace.stats.taskCount}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tóm tắt quyền của bạn</CardTitle>
                <CardDescription>
                  {workspace.role === "OWNER"
                    ? "Bạn có thể mời thành viên, đổi vai trò và xóa thành viên khỏi workspace này."
                    : "Bạn đang ở chế độ xem thông tin workspace và danh sách thành viên."}
                </CardDescription>
              </CardHeader>
              <CardContent className="rounded-b-md bg-muted/30 py-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="text-sm leading-7 text-muted-foreground">
                    Vai trò hiện tại của bạn là{" "}
                    <span className="font-medium text-foreground">{getWorkspaceRoleLabel(workspace.role, "full")}</span>.
                    {workspace.role === "OWNER"
                      ? " Mọi thay đổi thành viên sẽ được cập nhật ngay trong danh sách bên phải."
                      : " Nếu cần thay đổi thành viên hoặc quyền, hãy liên hệ quản trị viên của workspace."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <MemberList
            workspaceId={workspaceId}
            members={members}
            isLoading={membersQuery.isLoading}
            currentUserId={user?.id ?? null}
            canManage={canManageMembers}
            membersPage={MEMBERS_PAGE}
            membersLimit={MEMBERS_LIMIT}
          />
        </div>
      ) : null}
    </section>
  )
}
