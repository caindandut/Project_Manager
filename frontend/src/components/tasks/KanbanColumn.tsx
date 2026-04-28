import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import { KanbanCard } from "./KanbanCard"
import { QuickAddTask } from "./QuickAddTask"
import type { Task, TaskStatus } from "@/types/task"
import { TASK_STATUS_LABELS } from "@/types/task"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  projectKey: string
  onTaskClick: (task: Task) => void
  onAddTask: (title: string) => Promise<void>
}

const STATUS_STYLES: Record<TaskStatus, { bg: string; dot: string; header: string }> = {
  TODO: {
    bg: "bg-gray-50",
    dot: "bg-gray-400",
    header: "bg-[#F4F5F7]",
  },
  IN_PROGRESS: {
    bg: "bg-blue-50/50",
    dot: "bg-blue-500",
    header: "bg-[#E3F2FD]",
  },
  REVIEW: {
    bg: "bg-yellow-50/50",
    dot: "bg-yellow-500",
    header: "bg-[#FFF8E1]",
  },
  DONE: {
    bg: "bg-green-50/50",
    dot: "bg-green-500",
    header: "bg-[#E8F5E9]",
  },
  CANCELLED: {
    bg: "bg-red-50/30",
    dot: "bg-red-400",
    header: "bg-[#FFEBEE]",
  },
}

export function KanbanColumn({
  status,
  tasks,
  projectKey,
  onTaskClick,
  onAddTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status, type: "column" },
  })

  const styles = STATUS_STYLES[status] || STATUS_STYLES.TODO

  return (
    <div
      className={cn(
        "flex flex-col w-72 flex-shrink-0 rounded-lg border border-border bg-[#FAFBFC] overflow-hidden",
        isOver && "ring-2 ring-[#0052CC]/30 bg-blue-50/30"
      )}
    >
      {/* Column Header */}
      <div className={cn("px-3 py-2.5 flex items-center gap-2", styles.header)}>
        <span className={cn("w-2 h-2 rounded-full", styles.dot)} />
        <span className="text-sm font-semibold text-[#172B4D]">
          {TASK_STATUS_LABELS[status]}
        </span>
        <span className="ml-auto text-xs text-muted-foreground/70 bg-white/70 px-1.5 py-0.5 rounded-full font-medium">
          {tasks.length}
        </span>
      </div>

      {/* Task List */}
      <div
        ref={setNodeRef}
        className={cn("flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]", styles.bg)}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-xs text-muted-foreground/50">
              <span>Chưa có công việc nào</span>
              <span className="text-[10px] mt-1">Kéo thả hoặc nhấn + để thêm</span>
            </div>
          ) : (
            tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                projectKey={projectKey}
                onClick={() => onTaskClick(task)}
              />
            ))
          )}
        </SortableContext>
      </div>

      {/* Quick Add */}
      <div className="px-2 pb-2 mt-auto">
        <QuickAddTask status={status} onAdd={onAddTask} />
      </div>
    </div>
  )
}
