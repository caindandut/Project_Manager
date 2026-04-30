import ProjectTaskListPage from "@/pages/ProjectTaskListPage"
import { CalendarView } from "@/components/calendar/CalendarView"
import { GanttView } from "@/components/gantt/GanttView"

export function ProjectListPage() {
  return <ProjectTaskListPage />
}

export function ProjectKanbanPage() {
  return <ProjectTaskListPage initialViewMode="kanban" />
}

export function ProjectGanttPage() {
  return <GanttView />
}

export function ProjectCalendarPage() {
  return <CalendarView />
}

