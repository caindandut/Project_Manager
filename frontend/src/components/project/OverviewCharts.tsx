import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { ProjectStats } from "@/lib/project-api"

const STATUS_COLORS: Record<string, string> = {
  "Cần làm": "#94a3b8",
  "Đang làm": "#3b82f6",
  "Xem xét": "#f97316",
  "Hoàn thành": "#22c55e",
  "Đã hủy": "#ef4444",
}

const PRIORITY_COLORS: Record<string, string> = {
  "Thấp nhất": "#cbd5e1",
  "Thấp": "#60a5fa",
  "Trung bình": "#fbbf24",
  "Cao": "#f97316",
  "Rất cao": "#ef4444",
}

interface OverviewChartsProps {
  stats: ProjectStats | undefined
  isLoading: boolean
}

export default function OverviewCharts({ stats, isLoading }: OverviewChartsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[280px] rounded-lg" />
        <Skeleton className="h-[240px] rounded-lg" />
      </div>
    )
  }

  const pieData = stats ? [
    { name: "Cần làm", value: stats.todoTasks || 0, color: STATUS_COLORS["Cần làm"] },
    { name: "Đang làm", value: stats.inProgressTasks || 0, color: STATUS_COLORS["Đang làm"] },
    { name: "Xem xét", value: stats.reviewTasks || 0, color: STATUS_COLORS["Xem xét"] },
    { name: "Hoàn thành", value: stats.doneTasks || 0, color: STATUS_COLORS["Hoàn thành"] },
    { name: "Đã hủy", value: stats.cancelledTasks || 0, color: STATUS_COLORS["Đã hủy"] },
  ].filter((d) => d.value > 0) : []

  // Exclude cancelled tasks from completion rate denominator for meaningful progress tracking
  const activeTasks = (stats?.totalTasks || 0) - (stats?.cancelledTasks || 0)
  const completionRate = activeTasks > 0 ? Math.round((stats?.doneTasks || 0) / activeTasks * 100) : 0

  // Priority data for horizontal bar chart
  const priorityData = stats ? [
    { name: "Rất cao", value: stats.highestPriorityTasks || 0, color: PRIORITY_COLORS["Rất cao"] },
    { name: "Cao", value: stats.highPriorityTasks || 0, color: PRIORITY_COLORS["Cao"] },
    { name: "Trung bình", value: stats.mediumPriorityTasks || 0, color: PRIORITY_COLORS["Trung bình"] },
    { name: "Thấp", value: stats.lowPriorityTasks || 0, color: PRIORITY_COLORS["Thấp"] },
    { name: "Thấp nhất", value: stats.lowestPriorityTasks || 0, color: PRIORITY_COLORS["Thấp nhất"] },
  ] : []

  const hasPriorityData = priorityData.some(d => d.value > 0)

  // Tooltip styles matching the app theme
  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
    fontSize: "12px",
  }

  const chartTextColor = "hsl(var(--muted-foreground))"

  return (
    <div className="space-y-4">
      {/* Pie Chart — Status distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Biểu đồ trạng thái</CardTitle>
          <CardDescription>
            Tỷ lệ hoàn thành: <span className="font-semibold text-green-600">{completionRate}%</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
              Chưa có dữ liệu
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ color: chartTextColor, fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bar Chart — Priority distribution (horizontal) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Biểu đồ ưu tiên</CardTitle>
          <CardDescription>Số lượng công việc theo mức ưu tiên</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasPriorityData ? (
            <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
              Chưa có dữ liệu ưu tiên
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={priorityData.filter(d => d.value > 0)}
                layout="vertical"
                margin={{ left: 0, right: 16 }}
              >
                <XAxis type="number" tick={{ fill: chartTextColor, fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: chartTextColor, fontSize: 11 }} width={72} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {priorityData.filter(d => d.value > 0).map((entry, i) => (
                    <Cell key={`bar-${i}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
