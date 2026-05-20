import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Clock,
  FolderKanban,
  ListChecks,
  Settings,
  Users,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useWorkspaceDetailQuery } from "@/hooks/useWorkspaces"
import { cn } from "@/lib/utils"
import type { RecentActivity, RecentTask } from "@/types/workspace"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "buổi sáng"
  if (hour < 18) return "buổi chiều"
  return "buổi tối"
}

const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: "Cần làm",
  IN_PROGRESS: "Đang làm",
  REVIEW: "Đang xem xét",
  DONE: "Hoàn thành",
  CANCELLED: "Đã hủy",
}

const ACTIVITY_LABELS: Record<string, string> = {
  CREATE: "đã tạo",
  UPDATE: "đã cập nhật",
  DELETE: "đã xóa",
  COMMENT_CREATE: "đã bình luận",
  ATTACHMENT_UPLOAD: "đã tải tệp lên",
}

function formatActivity(activity: RecentActivity) {
  const actor = activity.user.name || activity.user.email
  const action = ACTIVITY_LABELS[activity.action] || activity.action.toLowerCase()
  const target = activity.task?.title || `${activity.entityType.toLowerCase()} #${activity.entityId}`
  return `${actor} ${action} ${target}`
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-8 text-center">
      <div className="rounded-full bg-muted p-3">
        <ListChecks className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function RecentTaskItem({ task, workspaceSlug }: { task: RecentTask; workspaceSlug: string }) {
  const taskLink = task.project
    ? `/workspaces/${workspaceSlug}/projects/${task.project.id}/kanban?task=${task.id}`
    : null

  const content = (
    <div className={cn(
      "flex items-start gap-3 rounded-md border p-3 transition-colors",
      taskLink ? "hover:bg-muted/50 cursor-pointer hover:border-primary/20 hover:shadow-sm" : ""
    )}>
      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{TASK_STATUS_LABELS[task.status] || task.status}</span>
          {task.project ? (
            <>
              <span>•</span>
              <span>{task.project.name}</span>
            </>
          ) : null}
          {task.assignee ? (
            <>
              <span>•</span>
              <span>{task.assignee.name || task.assignee.email}</span>
            </>
          ) : null}
          {task.updatedAt ? (
            <>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true, locale: vi })}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )

  return taskLink ? (
    <Link to={taskLink} className="block">
      {content}
    </Link>
  ) : content
}

export default function WorkspaceDashboard() {
  const params = useParams()
  const { user } = useAuth()
  const workspaceSlug = params.workspaceId || ""
  const workspaceQuery = useWorkspaceDetailQuery(workspaceSlug)
  const workspace = workspaceQuery.data

  useEffect(() => {
    document.title = workspace ? `${workspace.name} | Workspace` : "Dashboard | Project Manager"
  }, [workspace])

  if (!workspaceSlug) {
    return (
      <div className="p-6 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Workspace không hợp lệ</CardTitle>
            <CardDescription>Vui lòng quay lại danh sách workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/workspaces" className={cn(buttonVariants({ variant: "outline" }))}>
              Quay lại danh sách
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const displayName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "bạn"
  const today = format(new Date(), "EEEE, dd/MM/yyyy", { locale: vi })

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Chào {getGreeting()}, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      {workspaceQuery.isLoading ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
            <Skeleton className="h-[320px] rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[220px] rounded-lg" />
            <Skeleton className="h-[180px] rounded-lg" />
          </div>
        </div>
      ) : null}

      {workspaceQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Không tải được dữ liệu</CardTitle>
            <CardDescription>Đã xảy ra lỗi khi tải dữ liệu workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void workspaceQuery.refetch()}>
              Thử tải lại
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!workspaceQuery.isLoading && !workspaceQuery.isError && workspace ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Link to={`/workspaces/${workspaceSlug}/members`} className="block">
                <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:bg-muted/10 cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Thành viên
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{workspace.stats.memberCount}</div>
                  </CardContent>
                </Card>
              </Link>

              <Link to={`/workspaces/${workspaceSlug}/projects`} className="block">
                <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:bg-muted/10 cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4" />
                      Dự án
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{workspace.stats.projectCount}</div>
                  </CardContent>
                </Card>
              </Link>

              <Link to={`/workspaces/${workspaceSlug}/my-tasks`} className="block">
                <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:bg-muted/10 cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      Công việc
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{workspace.stats.taskCount}</div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Hoạt động gần đây
                </CardTitle>
                <CardDescription>Những cập nhật mới nhất trong workspace này</CardDescription>
              </CardHeader>
              <CardContent>
                {workspace.recentActivities && workspace.recentActivities.length > 0 ? (
                  <div className="space-y-3">
                    {workspace.recentActivities.map((activity) => {
                      const activityLink = activity.task && activity.task.project
                        ? `/workspaces/${workspaceSlug}/projects/${activity.task.project.id}/kanban?task=${activity.task.id}`
                        : activity.entityType === "PROJECT"
                        ? `/workspaces/${workspaceSlug}/projects/${activity.entityId}`
                        : activity.entityType === "MEMBER" || activity.entityType === "WORKSPACE_MEMBER"
                        ? `/workspaces/${workspaceSlug}/members`
                        : null;

                      const content = (
                        <div className={cn(
                          "flex items-start gap-3 rounded-md border p-3 transition-colors",
                          activityLink ? "hover:bg-muted/50 cursor-pointer hover:border-primary/20 hover:shadow-sm" : ""
                        )}>
                          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="line-clamp-2 text-sm font-medium">{formatActivity(activity)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: vi })}
                            </p>
                          </div>
                        </div>
                      )

                      return activityLink ? (
                        <Link key={activity.id} to={activityLink} className="block">
                          {content}
                        </Link>
                      ) : (
                        <div key={activity.id}>{content}</div>
                      )
                    })}
                  </div>
                ) : workspace.recentTasks && workspace.recentTasks.length > 0 ? (
                  <div className="space-y-3">
                    {workspace.recentTasks.map((task) => (
                      <RecentTaskItem key={task.id} task={task} workspaceSlug={workspaceSlug} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Chưa có hoạt động nào"
                    description="Khi thành viên tạo hoặc cập nhật công việc, các hoạt động mới sẽ xuất hiện tại đây."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Liên kết nhanh</CardTitle>
                <CardDescription>Điều hướng nhanh đến các mục đang hoạt động</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link
                  to={`/workspaces/${workspaceSlug}/projects`}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start gap-2")}
                >
                  <FolderKanban className="h-4 w-4" />
                  Dự án
                  <ArrowUpRight className="ml-auto h-3 w-3" />
                </Link>

                <Link
                  to={`/workspaces/${workspaceSlug}/members`}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start gap-2")}
                >
                  <Users className="h-4 w-4" />
                  Thành viên
                  <ArrowUpRight className="ml-auto h-3 w-3" />
                </Link>

                <Link
                  to={`/workspaces/${workspaceSlug}/my-tasks`}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start gap-2")}
                >
                  <ListChecks className="h-4 w-4" />
                  Công việc của tôi
                  <ArrowUpRight className="ml-auto h-3 w-3" />
                </Link>

                <Link
                  to={`/workspaces/${workspaceSlug}/settings`}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start gap-2")}
                >
                  <Settings className="h-4 w-4" />
                  Cài đặt workspace
                  <ArrowUpRight className="ml-auto h-3 w-3" />
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tổng quan công việc</CardTitle>
                <CardDescription>Phân bổ công việc theo trạng thái</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {workspace.stats.taskCount === 0 ? (
                  <EmptyState
                    title="Chưa có công việc"
                    description="Tạo công việc trong một project để bắt đầu theo dõi tiến độ."
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Circle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">Cần làm</span>
                      </div>
                      <span className="font-medium">{workspace.stats.todoCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-blue-500" />
                        <span className="text-sm">Đang làm</span>
                      </div>
                      <span className="font-medium">{workspace.stats.inProgressCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-sm">Hoàn thành</span>
                      </div>
                      <span className="font-medium">{workspace.stats.doneCount}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
