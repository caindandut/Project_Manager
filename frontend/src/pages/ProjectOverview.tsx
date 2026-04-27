import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import {
  CheckCircle2,
  Circle,
  Clock,
  FolderKanban,
  ListChecks,
  XCircle,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useProjectDetailQuery } from "@/hooks/useProject"
import { useWorkspaceDetailQuery } from "@/hooks/useWorkspaces"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

const STATUS_COLORS = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  DONE: "#22c55e",
  CANCELLED: "#ef4444",
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

export default function ProjectOverview() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug || ""
  const projectId = Number(params.projectId || "0")

  const workspaceQuery = useWorkspaceDetailQuery(workspaceSlug)
  const projectQuery = useProjectDetailQuery(workspaceSlug, projectId)
  const project = projectQuery.data

  useEffect(() => {
    document.title = project ? `${project.name} | Overview` : "Project Overview | Project Manager"
  }, [project])

  if (!workspaceSlug || !projectId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dự án không hợp lệ</CardTitle>
          <CardDescription>Vui lòng chọn một dự án hợp lệ.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to={`/workspaces/${workspaceSlug}/projects`} className={cn(buttonVariants({ variant: "outline" }))}>
            Quay lại danh sách dự án
          </Link>
        </CardContent>
      </Card>
    )
  }

  const pieChartData = project?.stats
    ? [
        { name: "Cần làm", value: project.stats.todoCount || 0, color: STATUS_COLORS.TODO },
        { name: "Đang làm", value: project.stats.inProgressCount || 0, color: STATUS_COLORS.IN_PROGRESS },
        { name: "Hoàn thành", value: project.stats.doneCount || 0, color: STATUS_COLORS.DONE },
      ].filter((d) => d.value > 0)
    : []

  const barChartData = project?.stats
    ? [
        { name: "Cần làm", tasks: project.stats.todoCount || 0 },
        { name: "Đang làm", tasks: project.stats.inProgressCount || 0 },
        { name: "Hoàn thành", tasks: project.stats.doneCount || 0 },
      ]
    : []

  const totalTasks = project?.stats?.totalTasks || 0
  const completionRate = totalTasks > 0 ? Math.round(((project?.stats?.doneCount || 0) / totalTasks) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to={`/workspaces/${workspaceSlug}`} className="hover:text-foreground">
          {workspaceQuery.data?.name || "Workspace"}
        </Link>
        <span>/</span>
        <Link to={`/workspaces/${workspaceSlug}/projects`} className="hover:text-foreground">
          Dự án
        </Link>
        <span>/</span>
        <span className="text-foreground">{project?.name || "Tải..."}</span>
      </div>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {projectQuery.isLoading ? <Skeleton className="h-8 w-48" /> : project?.name}
            </h1>
          </div>
        </div>
        {project?.description && (
          <p className="mt-2 max-w-3xl text-muted-foreground">{project.description}</p>
        )}
      </div>

      {/* Loading State */}
      {projectQuery.isLoading && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px] w-full rounded-lg" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
      )}

      {/* Error State */}
      {projectQuery.isError && (
        <Card>
          <CardHeader>
            <CardTitle>Không tải được dự án</CardTitle>
            <CardDescription>Đã xảy ra lỗi khi tải thông tin dự án.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void projectQuery.refetch()}>
              Thử tải lại
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!projectQuery.isLoading && !projectQuery.isError && project && (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Tổng công việc
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{project.stats?.totalTasks || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Đã giao
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{project.stats?.assignedTasks || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Hoàn thành
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{project.stats?.completedTasks || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>Tiến độ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completionRate}%</div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts & Recent Tasks */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pie Chart */}
            {pieChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Phân bổ công việc</CardTitle>
                  <CardDescription>Tỷ lệ công việc theo trạng thái</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bar Chart */}
            {barChartData.some((d) => d.tasks > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Số lượng công việc</CardTitle>
                  <CardDescription>Biểu đồ công việc theo trạng thái</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={barChartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Công việc gần đây
              </CardTitle>
              <CardDescription>Những công việc được tạo hoặc cập nhật gần đây trong dự án</CardDescription>
            </CardHeader>
            <CardContent>
              {!project.recentTasks || project.recentTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <ListChecks className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">Chưa có công việc nào</p>
                  <p className="mt-1 text-xs text-muted-foreground">Tạo công việc đầu tiên cho dự án này</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.recentTasks.map((task) => {
                    const StatusIcon = TASK_STATUS_ICONS[task.status] || Circle
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
                          <p className="text-sm font-medium">{task.title}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{TASK_STATUS_LABELS[task.status]}</span>
                            {task.assignee && (
                              <>
                                <span>•</span>
                                <span>{task.assignee.name || task.assignee.email}</span>
                              </>
                            )}
                            {task.updatedAt && (
                              <>
                                <span>•</span>
                                <span>
                                  {formatDistanceToNow(new Date(task.updatedAt), {
                                    addSuffix: true,
                                    locale: vi,
                                  })}
                                </span>
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
        </>
      )}
    </div>
  )
}
