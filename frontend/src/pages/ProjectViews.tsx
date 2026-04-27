import { useParams } from "react-router-dom"
import { Kanban, List, Calendar } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ProjectViewProps {
  view: "list" | "kanban" | "gantt" | "calendar"
}

function ProjectViewContent({ view }: ProjectViewProps) {
  const views = {
    list: { icon: List, title: "Danh sách", description: "Xem công việc dạng danh sách" },
    kanban: { icon: Kanban, title: "Kanban", description: "Xem công việc dạng bảng Kanban" },
    gantt: { icon: List, title: "Gantt", description: "Xem công việc dạng biểu đồ Gantt" },
    calendar: { icon: Calendar, title: "Lịch", description: "Xem công việc theo lịch" },
  }

  const config = views[view]
  const Icon = config.icon

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{config.title}</h1>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tính năng đang phát triển</CardTitle>
          <CardDescription>
            Chế độ xem {config.title.toLowerCase()} đang được xây dựng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Các thành phần UI và chức năng sẽ được thêm trong phiên bản tới.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function ProjectListPage() {
  return <ProjectViewContent view="list" />
}

export function ProjectKanbanPage() {
  return <ProjectViewContent view="kanban" />
}

export function ProjectGanttPage() {
  return <ProjectViewContent view="gantt" />
}

export function ProjectCalendarPage() {
  return <ProjectViewContent view="calendar" />
}
