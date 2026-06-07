import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Skeleton } from "@/components/ui/skeleton"
import type { Task, TaskPriority, TaskStatus } from "@/types/task"

type ChartStatusKey = TaskStatus | "OVERDUE"

type StackRow = {
  name: string
} & Record<ChartStatusKey, number>

type ChartTooltipPayload = {
  color?: string
  dataKey?: string | number
  name?: string | number
  payload?: { name?: string }
  value?: number | string
}

interface TaskChartsViewProps {
  tasks: Task[]
  isLoading: boolean
}

const STATUS_META: Record<ChartStatusKey, { label: string; color: string }> = {
  TODO: { label: "Chưa bắt đầu", color: "#B9A7FF" },
  IN_PROGRESS: { label: "Đang diễn ra", color: "#4F46E5" },
  REVIEW: { label: "Xem xét", color: "#F59E0B" },
  OVERDUE: { label: "Trễ", color: "#E0445A" },
  DONE: { label: "Đã hoàn thành", color: "#45C4B0" },
  CANCELLED: { label: "Đã hủy", color: "#8B8B98" },
}

const STACK_ORDER: ChartStatusKey[] = [
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "OVERDUE",
  "DONE",
  "CANCELLED",
]

const PRIORITY_BUCKETS: Array<{
  name: string
  priorities: TaskPriority[]
}> = [
  { name: "Thấp nhất", priorities: ["LOWEST"] },
  { name: "Thấp", priorities: ["LOW"] },
  { name: "Trung bình", priorities: ["MEDIUM"] },
  { name: "Cao", priorities: ["HIGH"] },
  { name: "Cao nhất", priorities: ["HIGHEST"] },
]

const KANBAN_BUCKETS: Array<{
  name: string
  statuses: TaskStatus[]
}> = [
  { name: "Chưa bắt đầu", statuses: ["TODO"] },
  { name: "Đang diễn ra", statuses: ["IN_PROGRESS"] },
  { name: "Xem xét", statuses: ["REVIEW"] },
  { name: "Hoàn thành", statuses: ["DONE"] },
  { name: "Đã hủy", statuses: ["CANCELLED"] },
]

const createStackRow = (name: string): StackRow => ({
  name,
  TODO: 0,
  IN_PROGRESS: 0,
  REVIEW: 0,
  OVERDUE: 0,
  DONE: 0,
  CANCELLED: 0,
})

const isTaskComplete = (task: Task): boolean =>
  task.status === "DONE" || task.status === "CANCELLED"

const isTaskOverdue = (task: Task): boolean => {
  if (!task.dueDate || isTaskComplete(task)) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = new Date(task.dueDate)
  dueDate.setHours(0, 0, 0, 0)

  return dueDate < today
}

const getChartStatus = (task: Task): ChartStatusKey =>
  isTaskOverdue(task) ? "OVERDUE" : task.status

const getAssigneeNames = (task: Task): string[] => {
  const assignees = task.assignees ?? []
  if (assignees.length > 0) {
    return assignees.map((assignee) => assignee.name || assignee.email)
  }

  if (task.assignee) {
    return [task.assignee.name || task.assignee.email]
  }

  return ["Chưa được chỉ định"]
}

const incrementStack = (row: StackRow, task: Task): void => {
  row[getChartStatus(task)] += 1
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: readonly ChartTooltipPayload[]
  label?: string | number
}) {
  const visibleItems = (payload ?? []).filter((item) => Number(item.value) > 0)

  if (!active || visibleItems.length === 0) return null

  const title = String(label ?? visibleItems[0]?.payload?.name ?? "")

  return (
    <div className="min-w-36 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      {title && <p className="mb-1.5 font-semibold">{title}</p>}
      <div className="space-y-1">
        {visibleItems.map((item) => (
          <div key={`${item.dataKey}-${item.name}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              {String(item.name ?? item.dataKey)}
            </span>
            <span className="font-medium">{Number(item.value)} nhiệm vụ</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartPanel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-md border bg-card text-card-foreground shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
      Chưa có dữ liệu biểu đồ
    </div>
  )
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2 text-xs text-muted-foreground">
      {STACK_ORDER.map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: STATUS_META[status].color }}
          />
          {STATUS_META[status].label}
        </span>
      ))}
    </div>
  )
}

export default function TaskChartsView({ tasks, isLoading }: TaskChartsViewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-[320px] rounded-md" />
        <Skeleton className="h-[320px] rounded-md" />
        <Skeleton className="h-[320px] rounded-md" />
        <Skeleton className="h-[320px] rounded-md xl:col-span-3" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-md border bg-card text-sm text-muted-foreground">
        Chưa có dữ liệu biểu đồ
      </div>
    )
  }

  const statusCounts = STACK_ORDER.map((status) => ({
    name: STATUS_META[status].label,
    key: status,
    value: tasks.filter((task) => getChartStatus(task) === status).length,
    color: STATUS_META[status].color,
  })).filter((item) => item.value > 0)

  const remainingTasks = tasks.filter((task) => !isTaskComplete(task)).length

  const priorityData = PRIORITY_BUCKETS.map((bucket) => {
    const row = createStackRow(bucket.name)
    tasks
      .filter((task) => bucket.priorities.includes(task.priority))
      .forEach((task) => incrementStack(row, task))
    return row
  })

  const bucketData = KANBAN_BUCKETS.map((bucket) => {
    const row = createStackRow(bucket.name)
    tasks
      .filter((task) => bucket.statuses.includes(task.status))
      .forEach((task) => incrementStack(row, task))
    return row
  })

  const memberRows = new Map<string, StackRow>()
  for (const task of tasks) {
    for (const name of getAssigneeNames(task)) {
      const row = memberRows.get(name) ?? createStackRow(name)
      incrementStack(row, task)
      memberRows.set(name, row)
    }
  }

  const memberData = Array.from(memberRows.values()).sort((a, b) => {
    const totalA = STACK_ORDER.reduce((sum, key) => sum + a[key], 0)
    const totalB = STACK_ORDER.reduce((sum, key) => sum + b[key], 0)
    return totalB - totalA
  })

  const chartAxisColor = "hsl(var(--muted-foreground))"
  const gridColor = "hsl(var(--border))"

  const stackedBars = STACK_ORDER.map((status) => (
    <Bar
      key={status}
      dataKey={status}
      name={STATUS_META[status].label}
      stackId="tasks"
      fill={STATUS_META[status].color}
      maxBarSize={48}
    />
  ))

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartPanel title="Trạng thái">
          {statusCounts.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="space-y-3">
              <div className="relative h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusCounts}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={88}
                      paddingAngle={1}
                      strokeWidth={0}
                    >
                      {statusCounts.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={false}
                      content={(props) => (
                        <ChartTooltip
                          active={props.active}
                          label={props.label}
                          payload={props.payload as unknown as readonly ChartTooltipPayload[]}
                        />
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-3xl font-semibold text-foreground">{remainingTasks}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">Tác vụ còn lại</p>
                </div>
              </div>
              <StatusLegend />
            </div>
          )}
        </ChartPanel>

        <ChartPanel title="Ưu tiên">
          <div className="space-y-3">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={priorityData} margin={{ top: 12, right: 16, left: -8, bottom: 8 }}>
                <CartesianGrid stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: chartAxisColor, fontSize: 11 }} interval={0} />
                <YAxis tick={{ fill: chartAxisColor, fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  cursor={false}
                  content={(props) => (
                    <ChartTooltip
                      active={props.active}
                      label={props.label}
                      payload={props.payload as unknown as readonly ChartTooltipPayload[]}
                    />
                  )}
                />
                {stackedBars}
              </BarChart>
            </ResponsiveContainer>
            <StatusLegend />
          </div>
        </ChartPanel>

        <ChartPanel title="Bộ chứa">
          <div className="space-y-3">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={bucketData} margin={{ top: 12, right: 16, left: -8, bottom: 8 }}>
                <CartesianGrid stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: chartAxisColor, fontSize: 11 }} interval={0} />
                <YAxis tick={{ fill: chartAxisColor, fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  cursor={false}
                  content={(props) => (
                    <ChartTooltip
                      active={props.active}
                      label={props.label}
                      payload={props.payload as unknown as readonly ChartTooltipPayload[]}
                    />
                  )}
                />
                {stackedBars}
              </BarChart>
            </ResponsiveContainer>
            <StatusLegend />
          </div>
        </ChartPanel>
      </div>

      <ChartPanel title="Thành viên">
        <div className="space-y-3">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={memberData} margin={{ top: 12, right: 24, left: -8, bottom: 8 }}>
              <CartesianGrid stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: chartAxisColor, fontSize: 11 }}
                interval={0}
                tickFormatter={(value: string) =>
                  value.length > 18 ? `${value.slice(0, 17)}…` : value
                }
              />
              <YAxis tick={{ fill: chartAxisColor, fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                cursor={false}
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    label={props.label}
                    payload={props.payload as unknown as readonly ChartTooltipPayload[]}
                  />
                )}
              />
              {stackedBars}
            </BarChart>
          </ResponsiveContainer>
          <StatusLegend />
        </div>
      </ChartPanel>
    </div>
  )
}
