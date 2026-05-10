import {
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  ListChecks,
  XCircle,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { RecentTask } from "@/lib/project-api"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<string, { icon: typeof Circle; color: string; label: string }> = {
  TODO: { icon: Circle, color: "text-slate-400", label: "Cần làm" },
  IN_PROGRESS: { icon: Clock, color: "text-blue-500", label: "Đang làm" },
  REVIEW: { icon: Eye, color: "text-orange-500", label: "Xem xét" },
  DONE: { icon: CheckCircle2, color: "text-green-500", label: "Hoàn thành" },
  CANCELLED: { icon: XCircle, color: "text-red-400", label: "Đã hủy" },
}

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  LOWEST: { color: "bg-slate-100 text-slate-600", label: "Thấp nhất" },
  LOW: { color: "bg-blue-50 text-blue-600", label: "Thấp" },
  MEDIUM: { color: "bg-yellow-50 text-yellow-700", label: "TB" },
  HIGH: { color: "bg-orange-50 text-orange-600", label: "Cao" },
  HIGHEST: { color: "bg-red-50 text-red-600", label: "Rất cao" },
}

interface RecentTasksCardProps {
  tasks: RecentTask[] | undefined
  isLoading: boolean
}

export default function RecentTasksCard({ tasks, isLoading }: RecentTasksCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4" />
          Công việc gần đây
        </CardTitle>
        <CardDescription>Những công việc được cập nhật gần đây nhất</CardDescription>
      </CardHeader>
      <CardContent>
        {!tasks || tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="rounded-full bg-muted p-3">
              <ListChecks className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Chưa có công việc nào</p>
            <p className="mt-1 text-xs text-muted-foreground">Tạo công việc đầu tiên cho dự án</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => {
              const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.TODO
              const StatusIcon = statusCfg.icon
              const priorityCfg = PRIORITY_CONFIG[task.priority || "MEDIUM"]
              const initials = task.assignee?.name
                ? task.assignee.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                : task.assignee?.email?.[0]?.toUpperCase() || "?"

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <StatusIcon className={cn("h-4 w-4 shrink-0", statusCfg.color)} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{statusCfg.label}</span>
                      {task.updatedAt && (
                        <>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true, locale: vi })}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {priorityCfg && (
                    <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", priorityCfg.color)}>
                      {priorityCfg.label}
                    </Badge>
                  )}

                  {task.assignee && (
                    <Avatar className="h-6 w-6">
                      {task.assignee.avatar && <AvatarImage src={task.assignee.avatar} />}
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
