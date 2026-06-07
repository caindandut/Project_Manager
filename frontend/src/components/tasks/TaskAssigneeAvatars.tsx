import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface TaskAssigneeAvatarUser {
  id?: number
  name?: string | null
  email?: string | null
  avatar?: string | null
}

export interface TaskAssigneeAvatarSource {
  assignee?: TaskAssigneeAvatarUser | null
  assignees?: TaskAssigneeAvatarUser[] | null
}

interface TaskAssigneeAvatarsProps {
  task: TaskAssigneeAvatarSource
  maxVisible?: number
  size?: "sm" | "default" | "lg"
  className?: string
  avatarClassName?: string
  countClassName?: string
  fallbackClassName?: string
  emptyClassName?: string
}

const getAssigneeLabel = (assignee: TaskAssigneeAvatarUser): string =>
  assignee.name || assignee.email || "?"

const getInitials = (assignee: TaskAssigneeAvatarUser): string => {
  const label = getAssigneeLabel(assignee).trim()
  if (!label) return "?"

  const words = label.split(/\s+/)
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase()
  }

  return label.slice(0, 2).toUpperCase()
}

export const getTaskAssignees = (task: TaskAssigneeAvatarSource): TaskAssigneeAvatarUser[] => {
  const source = task.assignees && task.assignees.length > 0
    ? task.assignees
    : task.assignee
      ? [task.assignee]
      : []

  const seenIds = new Set<string>()
  return source.filter((assignee, index) => {
    const key = assignee.id !== undefined ? `id:${assignee.id}` : `label:${getAssigneeLabel(assignee)}:${index}`
    if (seenIds.has(key)) return false
    seenIds.add(key)
    return true
  })
}

export default function TaskAssigneeAvatars({
  task,
  maxVisible = 3,
  size = "sm",
  className,
  avatarClassName,
  countClassName,
  fallbackClassName,
  emptyClassName,
}: TaskAssigneeAvatarsProps) {
  const assignees = getTaskAssignees(task)

  if (assignees.length === 0) {
    return <span className={cn("text-xs italic text-muted-foreground", emptyClassName)}>—</span>
  }

  const visibleAssignees = assignees.slice(0, maxVisible)
  const hiddenCount = assignees.length - visibleAssignees.length
  const title = assignees.map(getAssigneeLabel).join(", ")

  return (
    <AvatarGroup className={cn("-space-x-1.5", className)} title={title}>
      {visibleAssignees.map((assignee, index) => (
        <Avatar key={assignee.id ?? `${getAssigneeLabel(assignee)}-${index}`} size={size} className={avatarClassName}>
          {assignee.avatar ? (
            <AvatarImage src={assignee.avatar} alt={getAssigneeLabel(assignee)} />
          ) : null}
          <AvatarFallback className={cn("font-medium", fallbackClassName)}>
            {getInitials(assignee)}
          </AvatarFallback>
        </Avatar>
      ))}
      {hiddenCount > 0 ? (
        <AvatarGroupCount className={cn("text-[10px] font-medium", countClassName)}>
          +{hiddenCount}
        </AvatarGroupCount>
      ) : null}
    </AvatarGroup>
  )
}
