import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  FolderKanban,
  ListChecks,
  Settings,
  Users,
  XCircle,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useWorkspaceDetailQuery } from "@/hooks/useWorkspaces"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"
import { vi } from "date-fns/locale"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "buổi sáng"
  if (hour < 18) return "buổi chiều"
  return "buổi tối"
}

const TASK_STATUS_ICONS = {
  TODO: Circle,
  IN_PROGRESS: Clock,
  DONE: CheckCircle2,
  CANCELLED: XCircle,
}

const TASK_STATUS_LABELS = {
  TODO: "Cần làm",
  IN_PROGRESS: "Đang làm",
  DONE: "Hoàn thành",
  CANCELLED: "Đã hủy",
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
    )
  }

  const displayName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "bạn"
  const greeting = getGreeting()
  const today = format(new Date(), "EEEE, dd/MM/yyyy", { locale: vi })

  return (
    <div className="space-y-6">
      {/* Header with Greeting */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Chào {greeting}, {displayName}! 👋
        </h1>
        <p className="text-muted-foreground">{today}</p>
      </div>

      {workspaceQuery.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Skeleton className="h-[200px] w-full rounded-lg" />
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[200px] w-full rounded-lg" />
            <Skeleton className="h-[150px] w-full rounded-lg" />
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
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left Column - Activity & Stats */}
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
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

              <Card>
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

              <Card>
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
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Hoạt động gần đây
                </CardTitle>
                <CardDescription>Những công việc được tạo hoặc cập nhật gần đây</CardDescription>
              </CardHeader>
              <CardContent>
                {!workspace.recentTasks || workspace.recentTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="rounded-full bg-muted p-3">
                      <ListChecks className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">Chưa có hoạt động nào</p>
                    <p className="mt-1 text-xs text-muted-foreground">Các công việc được tạo sẽ xuất hiện ở đây</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workspace.recentTasks.map((task) => {
                      const StatusIcon = TASK_STATUS_ICONS[task.status as keyof typeof TASK_STATUS_ICONS] || Circle
                      return (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
                        >
                          <StatusIcon
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0",
                              task.status === "TODO" && "text-muted-foreground",
                              task.status === "IN_PROGRESS" && "text-blue-500",
                              task.status === "DONE" && "text-green-500",
                              task.status === "CANCELLED" && "text-muted-foreground",
                            )}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="truncate text-sm font-medium">{task.title}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>{TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS] || task.status}</span>
                              {task.assignee && (
                                <>
                                  <span>•</span>
                                  <span>{task.assignee.name || task.assignee.email}</span>
                                </>
                              )}
                              {task.updatedAt && (
                                <>
                                  <span>•</span>
                                  <span>{formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true, locale: vi })}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Links */}
          <div className="space-y-6">
            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Liên kết nhanh</CardTitle>
                <CardDescription>Điều hướng nhanh đến các mục</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link
                  to={`/workspaces/${workspaceSlug}/projects`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-start gap-2",
                  )}
                >
                  <FolderKanban className="h-4 w-4" />
                  Dự án của tôi
                  <ArrowUpRight className="ml-auto h-3 w-3" />
                </Link>

                <Link
                  to={`/workspaces/${workspaceSlug}/members`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-start gap-2",
                  )}
                >
                  <Users className="h-4 w-4" />
                  Thành viên
                  <ArrowUpRight className="ml-auto h-3 w-3" />
                </Link>

                <Link
                  to={`/workspaces/${workspaceSlug}/calendar`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-start gap-2",
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  Lịch làm việc
                  <ArrowUpRight className="ml-auto h-3 w-3" />
                </Link>

                <Link
                  to={`/workspaces/${workspaceSlug}/settings`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-start gap-2",
                  )}
                >
                  <Settings className="h-4 w-4" />
                  Cài đặt workspace
                  <ArrowUpRight className="ml-auto h-3 w-3" />
                </Link>
              </CardContent>
            </Card>

            {/* Task Summary */}
            {workspace.stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tổng quan công việc</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Circle className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">Cần làm</span>
                    </div>
                    <span className="font-medium">{workspace.stats.todoCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-blue-500" />
                      <span className="text-sm">Đang làm</span>
                    </div>
                    <span className="font-medium">{workspace.stats.inProgressCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span className="text-sm">Hoàn thành</span>
                    </div>
                    <span className="font-medium">{workspace.stats.doneCount || 0}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
