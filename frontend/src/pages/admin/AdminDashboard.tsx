import { Users, Building2, FolderKanban, ListChecks, ShieldBan, UserPlus, Globe } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminStats, useAdminTrends, useAdminRecentActivity } from '@/hooks/useAdmin'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const statCards = [
  { key: 'totalUsers', label: 'Người dùng', icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { key: 'totalWorkspaces', label: 'Workspaces', icon: Building2, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { key: 'totalProjects', label: 'Dự án', icon: FolderKanban, color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  { key: 'totalTasks', label: 'Công việc', icon: ListChecks, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { key: 'blockedUsers', label: 'Bị khóa', icon: ShieldBan, color: 'text-red-500', bgColor: 'bg-red-500/10' },
] as const

export default function AdminDashboard() {
  const statsQuery = useAdminStats()
  const trendsQuery = useAdminTrends(12)
  const recentQuery = useAdminRecentActivity(10)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tổng quan hệ thống</h1>
        <p className="text-sm text-muted-foreground">Giám sát hoạt động và quản lý nền tảng.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <Card key={card.key} className="border-border">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                {statsQuery.isLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {statsQuery.data?.[card.key] ?? 0}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts & Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Registration Trend Chart */}
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Xu hướng đăng ký (12 tháng)</CardTitle>
            <CardDescription>Số lượng người dùng và workspace mới theo tháng</CardDescription>
          </CardHeader>
          <CardContent>
            {trendsQuery.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendsQuery.data ?? []}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorWorkspaces" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickFormatter={(v) => {
                      const [, m] = v.split('-')
                      return `T${parseInt(m)}`
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => `Tháng ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name="Người dùng"
                    stroke="hsl(217, 91%, 60%)"
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="workspaces"
                    name="Workspaces"
                    stroke="hsl(160, 84%, 39%)"
                    fillOpacity={1}
                    fill="url(#colorWorkspaces)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Hoạt động gần đây</CardTitle>
            <CardDescription>Đăng ký mới & workspace mới</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : recentQuery.data?.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Chưa có hoạt động nào.
              </p>
            ) : (
              recentQuery.data?.map((activity) => (
                <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      activity.type === 'USER_REGISTERED'
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    }`}
                  >
                    {activity.type === 'USER_REGISTERED' ? (
                      <UserPlus className="h-4 w-4" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
