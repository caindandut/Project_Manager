import { List, Calendar } from "lucide-react"

import ProjectTaskListPage from "@/pages/ProjectTaskListPage"

export function ProjectListPage() {
  return <ProjectTaskListPage />
}

export function ProjectKanbanPage() {
  return <ProjectTaskListPage initialViewMode="kanban" />
}

export function ProjectGanttPage() {
  return <ProjectViewContent view="gantt" />
}

export function ProjectCalendarPage() {
  return <ProjectViewContent view="calendar" />
}

function ProjectViewContent({ view }: { view: "gantt" | "calendar" }) {
  const views = {
    gantt: { icon: List, title: "Gantt", description: "Xem công việc dạng biểu đồ Gantt" },
    calendar: { icon: Calendar, title: "Lịch", description: "Xem công việc theo lịch" },
  }

  const config = views[view]
  const Icon = config.icon

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{config.title}</h1>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </div>
      <p className="text-muted-foreground">Tính năng đang phát triển.</p>
    </div>
  )
}
