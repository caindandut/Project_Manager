import { Link } from "react-router-dom"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListChecks,
  Users,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { ProjectStats } from "@/lib/project-api"

interface StatsRowProps {
  stats: ProjectStats | undefined
  isLoading: boolean
  workspaceSlug: string
  projectId: number
}

const STAT_CARDS = [
  {
    key: "total",
    label: "Tổng công việc",
    icon: ListChecks,
    color: "text-slate-600",
    bg: "bg-slate-100",
    getValue: (s: ProjectStats) => s.totalTasks,
    getLink: (ws: string, pid: number) => `/workspaces/${ws}/projects/${pid}/list`,
  },
  {
    key: "inprogress",
    label: "Đang thực hiện",
    icon: Clock,
    color: "text-blue-600",
    bg: "bg-blue-50",
    getValue: (s: ProjectStats) => s.inProgressTasks,
    getLink: (ws: string, pid: number) => `/workspaces/${ws}/projects/${pid}/list?status=IN_PROGRESS`,
  },
  {
    key: "done",
    label: "Hoàn thành",
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50",
    getValue: (s: ProjectStats) => s.doneTasks,
    getLink: (ws: string, pid: number) => `/workspaces/${ws}/projects/${pid}/list?status=DONE`,
  },
  {
    key: "overdue",
    label: "Quá hạn",
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    getValue: (s: ProjectStats) => s.overdueTasks ?? 0,
    getLink: (ws: string, pid: number) => `/workspaces/${ws}/projects/${pid}/list`,
  },
  {
    key: "members",
    label: "Thành viên",
    icon: Users,
    color: "text-purple-600",
    bg: "bg-purple-50",
    getValue: (s: ProjectStats) => s.memberCount ?? 0,
    getLink: (_ws: string, _pid: number) => "#members",
  },
]

export default function StatsRow({ stats, isLoading, workspaceSlug, projectId }: StatsRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {STAT_CARDS.map((card) => {
        const Icon = card.icon
        const value = stats ? card.getValue(stats) : 0
        const link = card.getLink(workspaceSlug, projectId)

        const content = (
          <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        )

        if (link === "#members") {
          return (
            <a key={card.key} href="#members-section" className="block">
              {content}
            </a>
          )
        }

        return (
          <Link key={card.key} to={link} className="block">
            {content}
          </Link>
        )
      })}
    </div>
  )
}
