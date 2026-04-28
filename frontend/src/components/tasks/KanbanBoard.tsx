import { useState } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  PointerActivationConstraint,
} from "@dnd-kit/core"

import { KanbanCard } from "./KanbanCard"
import { KanbanColumn } from "./KanbanColumn"
import { Skeleton } from "@/components/ui/skeleton"
import type { Task, TaskStatus } from "@/types/task"
import { createTask as createTaskApi } from "@/lib/task-api"

interface KanbanBoardProps {
  tasks: Task[]
  isLoading: boolean
  projectId: number
  projectKey: string
  onTaskClick: (task: Task) => void
  onStatusChange: (taskId: number, newStatus: TaskStatus) => void
  onTasksChange: () => void
}

const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"]

export function KanbanBoard({
  tasks,
  isLoading,
  projectId,
  projectKey,
  onTaskClick,
  onStatusChange,
  onTasksChange,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    } as PointerActivationConstraint,
  })

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    } as PointerActivationConstraint,
  })

  const sensors = useSensors(mouseSensor, touchSensor)

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as number
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // Determine the target status
    let targetStatus: TaskStatus | null = null

    // Check if dropped over a column
    if (STATUS_ORDER.includes(over.id as TaskStatus)) {
      targetStatus = over.id as TaskStatus
    } else {
      // Dropped over another task - find its status
      const overTask = tasks.find((t) => t.id === over.id)
      if (overTask) {
        targetStatus = overTask.status
      }
    }

    // Only call onStatusChange, toast is handled by parent
    if (targetStatus && targetStatus !== task.status) {
      onStatusChange(taskId, targetStatus)
    }
  }

  const handleAddTask = async (status: TaskStatus, title: string) => {
    await createTaskApi(projectId, {
      title,
      status,
    })
    onTasksChange()
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {STATUS_ORDER.map((status) => (
          <div
            key={status}
            className="w-72 flex-shrink-0 bg-[#FAFBFC] rounded-lg border border-border overflow-hidden"
          >
            <div className="px-3 py-2.5 bg-[#F4F5F7]">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {STATUS_ORDER.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status)
          return (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columnTasks}
              projectKey={projectKey}
              onTaskClick={onTaskClick}
              onAddTask={(title) => handleAddTask(status, title)}
            />
          )
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="w-72">
            <KanbanCard
              task={activeTask}
              projectKey={projectKey}
              onClick={() => {}}
              isDragging
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
