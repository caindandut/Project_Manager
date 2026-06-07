import { useMemo, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock,
  Columns3,
  Filter,
  Inbox,
  ListChecks,
  MessageSquare,
  Search,
  UserRound,
} from "lucide-react"
import { formatDistanceToNow, isBefore, parseISO, startOfToday } from "date-fns"
import { vi } from "date-fns/locale"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import TaskDetailPanel from "@/components/tasks/TaskDetailPanel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useWorkspaceMembersQuery } from "@/hooks/useWorkspaces"
import apiClient from "@/lib/api-client"
import { formatTaskDateTime } from "@/lib/date-time"
import { toVietnameseErrorMessage } from "@/lib/error-messages"
import { myTasksQueryKeys, queryClient, taskQueryKeys } from "@/lib/query-client"
import { useRealtimeStore } from "@/lib/realtime"
import { updateTaskStatus } from "@/lib/task-api"
import { cn } from "@/lib/utils"
import type { Task, TaskPriority, TaskStatus, TaskUser } from "@/types/task"
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/types/task"

type TabKey = "inbox" | "board" | "list" | "activity"
type DueFilter = "all" | "overdue" | "today" | "week" | "none"
type RoleFilter = "all" | "assigned" | "created"
type SortField = "dueDate" | "updatedAt" | "priority"

interface MyTaskItem extends Task {
  project: {
    id: number
    name: string
    key: string
    workspaceId: number
  }
  assignedToMe: boolean
  createdByMe: boolean
}

interface MyActivityItem {
  id: number
  action: string
  entityType: string
  entityId: number
  field: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
  user: TaskUser
  task: {
    id: number
    title: string
    status: TaskStatus
    priority: TaskPriority
    projectId: number
    project: { id: number; name: string; key: string; workspaceId: number }
  } | null
  metadata: Record<string, unknown> | null
}

interface MyTasksResponse {
  tasks: MyTaskItem[]
  activities: MyActivityItem[]
  stats: {
    totalRelated: number
    assigned: number
    created: number
    inbox: number
    overdue: number
    dueToday: number
    completed: number
    byStatus: Partial<Record<TaskStatus, number>>
  }
  filters: {
    projects: Array<{ id: number; name: string; key: string }>
    statuses: TaskStatus[]
    priorities: TaskPriority[]
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const TABS: Array<{ key: TabKey; label: string; icon: typeof Inbox }> = [
  { key: "inbox", label: "Việc cần xử lý", icon: Inbox },
  { key: "board", label: "Bảng tiến độ", icon: Columns3 },
  { key: "list", label: "Danh sách", icon: ListChecks },
  { key: "activity", label: "Hoạt động", icon: Activity },
]

const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"]

const STATUS_STYLES: Record<TaskStatus, string> = {
  TODO: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300",
  REVIEW: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
  DONE: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300",
  CANCELLED: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300",
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  HIGHEST: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300",
  HIGH: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-300",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
  LOW: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300",
  LOWEST: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
}

function useMyTasksData(workspaceId: string, filters: {
  tab: TabKey
  q: string
  projectId: string
  status: string
  priority: string
  due: DueFilter
  role: RoleFilter
  sort: SortField
}) {
  const isRealtimeConnected = useRealtimeStore((state) => state.isConnected)

  return useQuery({
    queryKey: [...myTasksQueryKeys.workspace(workspaceId), filters],
    queryFn: async (): Promise<MyTasksResponse> => {
      const response = await apiClient.get<{ success: boolean; data: MyTasksResponse }>(
        `/workspaces/${workspaceId}/my-tasks`,
        {
          params: {
            tab: filters.tab,
            q: filters.q || undefined,
            projectId: filters.projectId === "all" ? undefined : filters.projectId,
            status: filters.status === "all" ? undefined : filters.status,
            priority: filters.priority === "all" ? undefined : filters.priority,
            due: filters.due === "all" ? undefined : filters.due,
            role: filters.role,
            sort: filters.sort,
            limit: filters.tab === "board" ? 200 : 50,
          },
        },
      )
      return response.data.data
    },
    enabled: Boolean(workspaceId),
    staleTime: 0,
    refetchInterval: isRealtimeConnected ? false : 2_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  })
}

export default function MyTasksPage() {
  const params = useParams<{ workspaceId: string }>()
  const workspaceId = params.workspaceId ?? ""
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabKey>("inbox")
  const [search, setSearch] = useState("")
  const [projectId, setProjectId] = useState("all")
  const [status, setStatus] = useState("all")
  const [priority, setPriority] = useState("all")
  const [due, setDue] = useState<DueFilter>("all")
  const [role, setRole] = useState<RoleFilter>("all")
  const [sort, setSort] = useState<SortField>("dueDate")
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(() => {
    const taskId = Number(searchParams.get("task") ?? "0")
    return Number.isFinite(taskId) && taskId > 0 ? taskId : null
  })

  const filters = useMemo(
    () => ({ tab: activeTab, q: search, projectId, status, priority, due, role, sort }),
    [activeTab, due, priority, projectId, role, search, sort, status],
  )
  const myTasksQuery = useMyTasksData(workspaceId, filters)
  const membersQuery = useWorkspaceMembersQuery(workspaceId, 1, 50)
  const statusMutation = useMutation({
    mutationFn: ({ taskId, nextStatus }: { taskId: number; nextStatus: TaskStatus }) =>
      updateTaskStatus(taskId, nextStatus),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: myTasksQueryKeys.workspace(workspaceId) })
      queryClient.refetchQueries({ queryKey: myTasksQueryKeys.workspace(workspaceId), type: "active" })
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(variables.taskId) })
    },
  })

  const data = myTasksQuery.data
  const tasks = data?.tasks ?? []
  const activities = data?.activities ?? []

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  )
  const selectedActivityTask = useMemo(
    () => activities.find((activity) => activity.task?.id === selectedTaskId)?.task ?? null,
    [activities, selectedTaskId],
  )

  const openTask = (task: Pick<MyTaskItem, "id">) => {
    setSelectedTaskId(task.id)
    setSearchParams((prev) => {
      prev.set("task", String(task.id))
      return prev
    })
  }

  const closeTask = () => {
    setSelectedTaskId(null)
    setSearchParams((prev) => {
      prev.delete("task")
      return prev
    })
  }

  const changeStatus = async (task: MyTaskItem, nextStatus: TaskStatus) => {
    if (task.status === nextStatus) return
    try {
      await statusMutation.mutateAsync({ taskId: task.id, nextStatus })
      toast.success(`Đã chuyển "${task.title}" sang ${TASK_STATUS_LABELS[nextStatus]}`)
    } catch (error) {
      toast.error(toVietnameseErrorMessage(error, "Không thể cập nhật trạng thái công việc."))
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 border-b border-border/60 px-6 pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold text-foreground">Công việc của bạn</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Tập trung xử lý việc được giao và việc bạn tạo trong workspace hiện tại.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricPill icon={Inbox} label="Cần xử lý" value={data?.stats.inbox ?? 0} />
            <MetricPill icon={AlertTriangle} label="Quá hạn" value={data?.stats.overdue ?? 0} tone="danger" />
            <MetricPill icon={CalendarClock} label="Hôm nay" value={data?.stats.dueToday ?? 0} tone="warning" />
            <MetricPill icon={CheckCircle2} label="Hoàn thành" value={data?.stats.completed ?? 0} tone="success" />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <TabButton
              key={tab.key}
              tab={tab}
              active={activeTab === tab.key}
              count={getTabCount(tab.key, data)}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 px-6 py-4">
        <MyTasksToolbar
          search={search}
          onSearchChange={setSearch}
          projectId={projectId}
          onProjectChange={setProjectId}
          status={status}
          onStatusChange={setStatus}
          priority={priority}
          onPriorityChange={setPriority}
          due={due}
          onDueChange={setDue}
          role={role}
          onRoleChange={setRole}
          sort={sort}
          onSortChange={setSort}
          projects={data?.filters.projects ?? []}
          showRole={activeTab === "list"}
        />
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        {myTasksQuery.isLoading ? (
          <LoadingState tab={activeTab} />
        ) : activeTab === "inbox" ? (
          <InboxTab tasks={tasks} onTaskClick={openTask} onStatusChange={changeStatus} />
        ) : activeTab === "board" ? (
          <BoardTab
            tasks={tasks}
            activeTaskId={statusMutation.isPending ? statusMutation.variables?.taskId ?? null : null}
            onTaskClick={openTask}
            onStatusChange={changeStatus}
          />
        ) : activeTab === "list" ? (
          <ListTab tasks={tasks} onTaskClick={openTask} onStatusChange={changeStatus} />
        ) : (
          <ActivityTab activities={activities} onTaskOpen={(taskId) => openTask({ id: taskId })} />
        )}
      </div>

      <TaskDetailPanel
        taskId={selectedTaskId}
        projectId={selectedTask?.projectId ?? selectedActivityTask?.projectId ?? 0}
        projectKey={selectedTask?.project.key ?? selectedActivityTask?.project.key ?? "TASK"}
        open={selectedTaskId !== null}
        onClose={closeTask}
        onTaskUpdated={() => {
          void myTasksQuery.refetch()
        }}
        projectMembers={(membersQuery.data?.data ?? []).map((member) => member.user)}
      />
    </div>
  )
}

function MetricPill({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Inbox
  label: string
  value: number
  tone?: "default" | "danger" | "warning" | "success"
}) {
  const tones = {
    default: "text-blue-700 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-950/35 dark:border-blue-900/70",
    danger: "text-red-700 bg-red-50 border-red-100 dark:text-red-300 dark:bg-red-950/35 dark:border-red-900/70",
    warning: "text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-950/35 dark:border-amber-900/70",
    success: "text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/35 dark:border-emerald-900/70",
  }

  return (
    <div className={cn("flex min-w-32 items-center gap-2 rounded-md border px-3 py-2", tones[tone])}>
      <Icon className="h-4 w-4" />
      <div className="min-w-0">
        <p className="text-[11px] leading-4 opacity-80">{label}</p>
        <p className="text-base font-semibold leading-5">{value}</p>
      </div>
    </div>
  )
}

function TabButton({
  tab,
  active,
  count,
  onClick,
}: {
  tab: { key: TabKey; label: string; icon: typeof Inbox }
  active: boolean
  count: number
  onClick: () => void
}) {
  const Icon = tab.icon
  return (
    <button
      type="button"
      className={cn(
        "relative flex h-10 items-center gap-2 whitespace-nowrap px-4 text-sm font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {tab.label}
      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{count}</span>
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-primary" />}
    </button>
  )
}

function MyTasksToolbar({
  search,
  onSearchChange,
  projectId,
  onProjectChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  due,
  onDueChange,
  role,
  onRoleChange,
  sort,
  onSortChange,
  projects,
  showRole,
}: {
  search: string
  onSearchChange: (value: string) => void
  projectId: string
  onProjectChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  priority: string
  onPriorityChange: (value: string) => void
  due: DueFilter
  onDueChange: (value: DueFilter) => void
  role: RoleFilter
  onRoleChange: (value: RoleFilter) => void
  sort: SortField
  onSortChange: (value: SortField) => void
  projects: Array<{ id: number; name: string; key: string }>
  showRole: boolean
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo tên task, project hoặc mã project"
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:flex xl:flex-none">
        {showRole && (
          <Select value={role} onValueChange={(value) => onRoleChange(value as RoleFilter)}>
            <SelectTrigger className="h-9 w-full xl:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="assigned">Giao cho tôi</SelectItem>
              <SelectItem value="created">Tôi tạo</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Select value={projectId} onValueChange={onProjectChange}>
          <SelectTrigger className="h-9 w-full xl:w-44">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả project</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={String(project.id)}>
                {project.key} · {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-9 w-full xl:w-40">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            {STATUS_ORDER.map((item) => (
              <SelectItem key={item} value={item}>
                {TASK_STATUS_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={onPriorityChange}>
          <SelectTrigger className="h-9 w-full xl:w-36">
            <SelectValue placeholder="Ưu tiên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi ưu tiên</SelectItem>
            {(["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"] as TaskPriority[]).map((item) => (
              <SelectItem key={item} value={item}>
                {TASK_PRIORITY_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={due} onValueChange={(value) => onDueChange(value as DueFilter)}>
          <SelectTrigger className="h-9 w-full xl:w-36">
            <SelectValue placeholder="Ngày hạn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi ngày hạn</SelectItem>
            <SelectItem value="overdue">Quá hạn</SelectItem>
            <SelectItem value="today">Hôm nay</SelectItem>
            <SelectItem value="week">Tuần này</SelectItem>
            <SelectItem value="none">Chưa có hạn</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(value) => onSortChange(value as SortField)}>
          <SelectTrigger className="h-9 w-full xl:w-36">
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate">Theo ngày hạn</SelectItem>
            <SelectItem value="updatedAt">Mới cập nhật</SelectItem>
            <SelectItem value="priority">Theo ưu tiên</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function InboxTab({
  tasks,
  onTaskClick,
  onStatusChange,
}: {
  tasks: MyTaskItem[]
  onTaskClick: (task: MyTaskItem) => void
  onStatusChange: (task: MyTaskItem, status: TaskStatus) => void
}) {
  const groupedTasks = useMemo(() => {
    const overdue: MyTaskItem[] = []
    const dueToday: MyTaskItem[] = []
    const next: MyTaskItem[] = []

    for (const task of tasks) {
      if (isTaskOverdue(task)) {
        overdue.push(task)
      } else if (isTaskDueToday(task)) {
        dueToday.push(task)
      } else {
        next.push(task)
      }
    }

    return { overdue, dueToday, next }
  }, [tasks])

  if (tasks.length === 0) {
    return <EmptyState icon={Inbox} title="Inbox trống" description="Không có công việc nào cần bạn xử lý ngay." />
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
      <TaskSection title="Cần chú ý" count={groupedTasks.overdue.length + groupedTasks.dueToday.length}>
        {[...groupedTasks.overdue, ...groupedTasks.dueToday].map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} onStatusChange={onStatusChange} />
        ))}
        {groupedTasks.overdue.length + groupedTasks.dueToday.length === 0 && (
          <p className="py-6 text-sm text-muted-foreground">Không có task quá hạn hoặc đến hạn hôm nay.</p>
        )}
      </TaskSection>

      <TaskSection title="Tiếp theo" count={groupedTasks.next.length}>
        {groupedTasks.next.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} onStatusChange={onStatusChange} />
        ))}
      </TaskSection>
    </div>
  )
}

function BoardTab({
  tasks,
  activeTaskId,
  onTaskClick,
  onStatusChange,
}: {
  tasks: MyTaskItem[]
  activeTaskId: number | null
  onTaskClick: (task: MyTaskItem) => void
  onStatusChange: (task: MyTaskItem, status: TaskStatus) => void
}) {
  const [draggedTask, setDraggedTask] = useState<MyTaskItem | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const tasksByStatus = useMemo(() => {
    const map = new Map<TaskStatus, MyTaskItem[]>()
    for (const status of STATUS_ORDER) map.set(status, [])
    for (const task of tasks) {
      map.get(task.status)?.push(task)
    }
    return map
  }, [tasks])

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((item) => item.id === event.active.id)
    setDraggedTask(task ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const task = tasks.find((item) => item.id === event.active.id)
    setDraggedTask(null)
    if (!task || !event.over) return

    const status = STATUS_ORDER.includes(event.over.id as TaskStatus)
      ? (event.over.id as TaskStatus)
      : tasks.find((item) => item.id === event.over?.id)?.status

    if (status) {
      void onStatusChange(task, status)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-3 overflow-x-auto pb-2">
        {STATUS_ORDER.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={tasksByStatus.get(status) ?? []}
            activeTaskId={activeTaskId}
            onTaskClick={onTaskClick}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
      <DragOverlay>
        {draggedTask ? (
          <div className="w-72">
            <TaskCard task={draggedTask} onClick={() => undefined} onStatusChange={onStatusChange} compact />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function BoardColumn({
  status,
  tasks,
  activeTaskId,
  onTaskClick,
  onStatusChange,
}: {
  status: TaskStatus
  tasks: MyTaskItem[]
  activeTaskId: number | null
  onTaskClick: (task: MyTaskItem) => void
  onStatusChange: (task: MyTaskItem, status: TaskStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-[460px] w-72 flex-shrink-0 flex-col rounded-md border bg-muted/20",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot status={status} />
          <h2 className="truncate text-sm font-semibold">{TASK_STATUS_LABELS[status]}</h2>
        </div>
        <span className="rounded bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            disabled={activeTaskId === task.id}
            onClick={() => onTaskClick(task)}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </section>
  )
}

function DraggableTaskCard({
  task,
  disabled,
  onClick,
  onStatusChange,
}: {
  task: MyTaskItem
  disabled: boolean
  onClick: () => void
  onStatusChange: (task: MyTaskItem, status: TaskStatus) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled,
  })
  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        onClick={onClick}
        onStatusChange={onStatusChange}
        compact
        className={isDragging ? "opacity-40" : ""}
      />
    </div>
  )
}

function ListTab({
  tasks,
  onTaskClick,
  onStatusChange,
}: {
  tasks: MyTaskItem[]
  onTaskClick: (task: MyTaskItem) => void
  onStatusChange: (task: MyTaskItem, status: TaskStatus) => void
}) {
  if (tasks.length === 0) {
    return <EmptyState icon={Filter} title="Không có task phù hợp" description="Thử đổi bộ lọc hoặc từ khóa tìm kiếm." />
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="grid grid-cols-[minmax(220px,1.8fr)_170px_150px_130px_130px] gap-5 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>Công việc</span>
        <span>Trạng thái</span>
        <span>Ưu tiên</span>
        <span>Ngày hạn</span>
        <span>Vai trò</span>
      </div>
      <div className="divide-y">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="grid grid-cols-[minmax(220px,1.8fr)_170px_150px_130px_130px] gap-5 px-3 py-3 transition-colors hover:bg-muted/40"
          >
            <button type="button" className="min-w-0 text-left" onClick={() => onTaskClick(task)}>
              <TaskTitle task={task} />
            </button>
            <div>
              <StatusSelect task={task} onStatusChange={onStatusChange} />
            </div>
            <div className="flex items-start">
              <PriorityBadge priority={task.priority} />
            </div>
            <DueDate task={task} />
            <RoleBadges task={task} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityTab({
  activities,
  onTaskOpen,
}: {
  activities: MyActivityItem[]
  onTaskOpen: (taskId: number) => void
}) {
  if (activities.length === 0) {
    return <EmptyState icon={Activity} title="Chưa có hoạt động" description="Các cập nhật của bạn trong workspace sẽ xuất hiện ở đây." />
  }

  return (
    <div className="max-w-4xl divide-y rounded-md border bg-background">
      {activities.map((activity) => (
        <ActivityRow key={activity.id} activity={activity} onTaskOpen={onTaskOpen} />
      ))}
    </div>
  )
}

function TaskSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-md border bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2 p-3">{children}</div>
    </section>
  )
}

function TaskCard({
  task,
  onClick,
  onStatusChange,
  compact = false,
  className,
}: {
  task: MyTaskItem
  onClick: () => void
  onStatusChange: (task: MyTaskItem, status: TaskStatus) => void
  compact?: boolean
  className?: string
}) {
  return (
    <article
      className={cn(
        "group rounded-md border bg-card p-3 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/30",
        className,
      )}
    >
      <button type="button" className="w-full text-left" onClick={onClick}>
        <div className="flex items-start justify-between gap-3">
          <TaskTitle task={task} />
          {!compact && <DueDate task={task} />}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          <RoleBadges task={task} />
        </div>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          {task.commentCount ?? 0}
        </div>
        <StatusSelect task={task} onStatusChange={onStatusChange} />
      </div>
    </article>
  )
}

function TaskTitle({ task }: { task: MyTaskItem }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {task.project.key}-{task.id}
        </span>
        <span className="truncate text-xs text-muted-foreground">{task.project.name}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">{task.title}</p>
    </div>
  )
}

function StatusSelect({
  task,
  onStatusChange,
}: {
  task: MyTaskItem
  onStatusChange: (task: MyTaskItem, status: TaskStatus) => void
}) {
  return (
    <Select value={task.status} onValueChange={(value) => onStatusChange(task, value as TaskStatus)}>
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((status) => (
          <SelectItem key={status} value={status}>
            {TASK_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn("font-normal", STATUS_STYLES[status])}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="outline" className={cn("font-normal", PRIORITY_STYLES[priority])}>
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  )
}

function RoleBadges({ task }: { task: MyTaskItem }) {
  return (
    <span className="flex flex-wrap gap-1">
      {task.assignedToMe && (
        <Badge variant="secondary" className="gap-1 font-normal">
          <UserRound className="h-3 w-3" />
          Giao cho tôi
        </Badge>
      )}
      {task.createdByMe && (
        <Badge variant="secondary" className="font-normal">
          Tôi tạo
        </Badge>
      )}
    </span>
  )
}

function DueDate({ task }: { task: MyTaskItem }) {
  if (!task.dueDate) {
    return <span className="text-xs text-muted-foreground">Chưa có hạn</span>
  }

  const overdue = isTaskOverdue(task)
  return (
    <span className={cn("whitespace-nowrap text-xs", overdue ? "font-medium text-red-600" : "text-muted-foreground")}>
      {formatTaskDateTime(task.dueDate)}
    </span>
  )
}

function ActivityRow({
  activity,
  onTaskOpen,
}: {
  activity: MyActivityItem
  onTaskOpen: (taskId: number) => void
}) {
  const timeAgo = formatDistanceToNow(parseISO(activity.createdAt), { addSuffix: true, locale: vi })
  const Icon = activity.action === "CREATE" ? Circle : activity.action === "UPDATE" ? CheckSquare : MessageSquare

  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={activity.user.avatar ?? undefined} />
            <AvatarFallback className="text-[10px]">{activity.user.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{activity.user.name ?? activity.user.email}</span>{" "}
            {formatActivityText(activity)}
          </p>
        </div>
        {activity.task && (
          <button
            type="button"
            className="mt-2 inline-flex max-w-full items-center gap-1 rounded border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
            onClick={() => onTaskOpen(activity.task!.id)}
          >
            <span className="truncate">{activity.task.project.key}-{activity.task.id} · {activity.task.title}</span>
            <ArrowUpRight className="h-3 w-3 shrink-0" />
          </button>
        )}
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </p>
      </div>
    </div>
  )
}

function LoadingState({ tab }: { tab: TabKey }) {
  const columns = tab === "board" ? 5 : 1
  return (
    <div className={cn("grid gap-3", tab === "board" && "grid-cols-5")}>
      {Array.from({ length: columns }).map((_, index) => (
        <div key={index} className="space-y-2 rounded-md border p-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Inbox
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border bg-background px-4 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function StatusDot({ status }: { status: TaskStatus }) {
  const colors: Record<TaskStatus, string> = {
    TODO: "bg-slate-400",
    IN_PROGRESS: "bg-blue-500",
    REVIEW: "bg-amber-500",
    DONE: "bg-emerald-500",
    CANCELLED: "bg-red-500",
  }
  return <span className={cn("h-2.5 w-2.5 rounded-sm", colors[status])} />
}

function getTabCount(tab: TabKey, data?: MyTasksResponse) {
  if (!data) return 0
  if (tab === "inbox") return data.stats.inbox
  if (tab === "activity") return data.activities.length
  return data.pagination.total
}

function isTaskOverdue(task: MyTaskItem) {
  return Boolean(
    task.dueDate &&
      task.status !== "DONE" &&
      task.status !== "CANCELLED" &&
      isBefore(parseISO(task.dueDate), startOfToday()),
  )
}

function isTaskDueToday(task: MyTaskItem) {
  if (!task.dueDate || task.status === "DONE" || task.status === "CANCELLED") return false
  const date = parseISO(task.dueDate)
  const today = new Date()
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
}

function formatActivityText(activity: MyActivityItem) {
  const taskTitle = activity.task?.title ?? `#${activity.entityId}`

  if (activity.action === "CREATE") {
    return (
      <>
        đã tạo <span className="font-medium text-foreground">{taskTitle}</span>
      </>
    )
  }

  if (activity.action === "UPDATE" && activity.field) {
    const fieldLabels: Record<string, string> = {
      status: "trạng thái",
      priority: "ưu tiên",
      title: "tiêu đề",
      description: "mô tả",
      assignee: "người phụ trách",
      dueDate: "ngày hạn",
      startDate: "ngày bắt đầu",
    }
    return (
      <>
        cập nhật {fieldLabels[activity.field] ?? activity.field} của{" "}
        <span className="font-medium text-foreground">{taskTitle}</span>
      </>
    )
  }

  return (
    <>
      cập nhật <span className="font-medium text-foreground">{taskTitle}</span>
    </>
  )
}
