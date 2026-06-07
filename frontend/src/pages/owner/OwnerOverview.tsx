import { useMemo } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  FolderKanban,
  ListChecks,
  ShieldBan,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminRecentActivity, useAdminStats, useAdminTrends } from '@/hooks/useAdmin'

// ============================================================
// Sub-Components
// ============================================================

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  isLoading,
}: {
  icon: typeof Users
  label: string
  value: number
  accent: string
  isLoading: boolean
}) {
  return (
    <Card className="group relative overflow-hidden border-border transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold tabular-nums text-foreground">{value}</p>
          )}
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityTimeline({
  activities,
  isLoading,
}: {
  activities: { id: number; type: string; description: string; createdAt: string }[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (!activities.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Chưa có hoạt động nào.
      </p>
    )
  }

  return (
    <div className="relative space-y-0">
      {/* Timeline line */}
      <div className="absolute bottom-0 left-[19px] top-0 w-px bg-border" />

      {activities.map((activity) => {
        const isUser = activity.type === 'USER_REGISTERED'
        return (
          <div key={`${activity.type}-${activity.id}`} className="relative flex gap-4 py-3">
            {/* Timeline dot */}
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background shadow-sm ${
                isUser
                  ? 'bg-blue-500/10 text-blue-600'
                  : 'bg-emerald-500/10 text-emerald-600'
              }`}
            >
              {isUser ? (
                <UserPlus className="h-4 w-4" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </div>
            {/* Content */}
            <div className="min-w-0 flex-1 pt-1">
              <p className="truncate text-sm text-foreground">{activity.description}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(activity.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

const statCardConfig = [
  {
    key: 'totalUsers' as const,
    label: 'Người dùng',
    icon: Users,
    accent: 'bg-blue-500/10 text-blue-600',
  },
  {
    key: 'totalWorkspaces' as const,
    label: 'Workspaces',
    icon: Building2,
    accent: 'bg-violet-500/10 text-violet-600',
  },
  {
    key: 'totalProjects' as const,
    label: 'Dự án',
    icon: FolderKanban,
    accent: 'bg-amber-500/10 text-amber-600',
  },
  {
    key: 'totalTasks' as const,
    label: 'Công việc',
    icon: ListChecks,
    accent: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    key: 'blockedUsers' as const,
    label: 'Tài khoản khóa',
    icon: ShieldBan,
    accent: 'bg-red-500/10 text-red-600',
  },
  {
    key: 'overdueTasks' as const,
    label: 'Quá hạn',
    icon: AlertTriangle,
    accent: 'bg-orange-500/10 text-orange-600',
  },
]

export default function OwnerOverview() {
  const statsQuery = useAdminStats()
  const trendsQuery = useAdminTrends(12)
  const recentQuery = useAdminRecentActivity(12)
  const stats = statsQuery.data

  // Format chart data — show tên tháng ngắn gọn
  const chartData = useMemo(() => {
    return (trendsQuery.data ?? []).map((item) => {
      const [year, month] = item.month.split('-')
      return {
        ...item,
        label: `T${parseInt(month)}/${year?.slice(2)}`,
      }
    })
  }, [trendsQuery.data])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">
          Giám sát toàn diện người dùng, workspace và dự án trên nền tảng.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCardConfig.map((card) => (
          <StatCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={stats?.[card.key] ?? 0}
            accent={card.accent}
            isLoading={statsQuery.isLoading}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 xl:grid-cols-5">
        {/* Chart — takes 3/5 */}
        <Card className="border-border xl:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Tăng trưởng 12 tháng
                </CardTitle>
                <CardDescription>Người dùng và workspace mới theo tháng</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trendsQuery.isLoading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradWorkspaces" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        users: 'Người dùng',
                        workspaces: 'Workspaces',
                      }
                      return [value, labels[String(name)] ?? name]
                    }}
                    labelFormatter={(label) => `Tháng ${label}`}
                  />
                  <Area
                    dataKey="users"
                    name="users"
                    type="monotone"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#gradUsers)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2 }}
                  />
                  <Area
                    dataKey="workspaces"
                    name="workspaces"
                    type="monotone"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gradWorkspaces)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {/* Custom legend */}
            <div className="mt-2 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-xs text-muted-foreground">Người dùng</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground">Workspaces</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right sidebar — takes 2/5 */}
        <div className="space-y-6 xl:col-span-2">
          {/* Recent Activity */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Hoạt động gần đây</CardTitle>
                  <CardDescription>Đăng ký và workspace mới</CardDescription>
                </div>
                <NavLink
                  to="/owner/audit-logs"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Xem tất cả
                  <ArrowUpRight className="h-3 w-3" />
                </NavLink>
              </div>
            </CardHeader>
            <CardContent>
              <ActivityTimeline
                activities={recentQuery.data ?? []}
                isLoading={recentQuery.isLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
