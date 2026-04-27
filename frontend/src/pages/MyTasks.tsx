import { useParams } from "react-router-dom"
import { CheckSquare, ListChecks } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useMyTasksQuery } from "@/hooks/useProjects"
import { cn } from "@/lib/utils"

const TASK_STATUS_CONFIG = {
  TODO: { label: "Cần làm", color: "text-muted-foreground" },
  IN_PROGRESS: { label: "Đang làm", color: "text-blue-500" },
  DONE: { label: "Hoàn thành", color: "text-green-500" },
  CANCELLED: { label: "Đã hủy", color: "text-muted-foreground" },
}

export default function MyTasksPage() {
  const params = useParams()
  const workspaceId = Number(params.workspaceId || "0")
  const tasksQuery = useMyTasksQuery(workspaceId, 1, 20)
  const tasks = tasksQuery.data?.data ?? []

  if (!workspaceId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lỗi</CardTitle>
          <CardDescription>Workspace không hợp lệ.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <CheckSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Công việc của tôi</h1>
          <p className="text-sm text-muted-foreground">
            Các công việc được giao cho bạn
          </p>
        </div>
      </div>

      {tasksQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4">
              <ListChecks className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-medium">Không có công việc nào</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Bạn chưa có công việc nào được giao
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const statusConfig = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.TODO
            return (
              <Card key={task.id} className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={cn("flex-1 min-w-0")}>
                    <p className="font-medium truncate">{task.title}</p>
                    {task.project && (
                      <p className="text-sm text-muted-foreground truncate">
                        {task.project.name}
                      </p>
                    )}
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    statusConfig.color
                  )}>
                    {statusConfig.label}
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
