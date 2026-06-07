import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  HardDrive,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  ShieldBan,
  ShieldCheck,
  TimerReset,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCleanupExpiredOtpCodesMutation,
  useCleanupExpiredRefreshTokensMutation,
  useOwnerSystemHealth,
} from '@/hooks/useAdmin'

// ============================================================
// Sub-Components
// ============================================================

function OverallStatusBanner({
  health,
}: {
  health: {
    database: { status: string }
    email: { smtpConfigured: boolean; gmailApiConfigured: boolean }
    oauth: { googleConfigured: boolean }
    riskSignals: { blockedUsers: number; overdueTasks: number }
  }
}) {
  const dbOk = health.database.status === 'ok'
  const emailOk = health.email.smtpConfigured || health.email.gmailApiConfigured
  const oauthOk = health.oauth.googleConfigured

  const servicesOk = dbOk && emailOk && oauthOk
  const hasRisks = health.riskSignals.blockedUsers > 0 || health.riskSignals.overdueTasks > 0

  let status: 'healthy' | 'warning' | 'critical'
  let label: string
  let description: string

  if (!servicesOk) {
    status = 'critical'
    label = 'Có sự cố cần xử lý'
    description = 'Một hoặc nhiều dịch vụ cốt lõi đang gặp vấn đề. Kiểm tra chi tiết bên dưới.'
  } else if (hasRisks) {
    status = 'warning'
    label = 'Hệ thống hoạt động, có cảnh báo'
    description = 'Tất cả dịch vụ hoạt động bình thường nhưng có một số tín hiệu cần chú ý.'
  } else {
    status = 'healthy'
    label = 'Hệ thống hoạt động tốt'
    description = 'Tất cả dịch vụ đều đang hoạt động bình thường.'
  }

  const styles = {
    healthy: {
      bg: 'bg-emerald-500/8 border-emerald-500/20',
      icon: 'text-emerald-500',
      dot: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
    },
    warning: {
      bg: 'bg-amber-500/8 border-amber-500/20',
      icon: 'text-amber-500',
      dot: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-400',
    },
    critical: {
      bg: 'bg-red-500/8 border-red-500/20',
      icon: 'text-red-500',
      dot: 'bg-red-500',
      text: 'text-red-700 dark:text-red-400',
    },
  }

  const s = styles[status]

  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 ${s.bg}`}>
      <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background shadow-sm`}>
        {status === 'healthy' && <CheckCircle2 className={`h-6 w-6 ${s.icon}`} />}
        {status === 'warning' && <AlertTriangle className={`h-6 w-6 ${s.icon}`} />}
        {status === 'critical' && <ShieldBan className={`h-6 w-6 ${s.icon}`} />}
        <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ${s.dot} ring-2 ring-background ${status !== 'critical' ? 'animate-pulse' : 'animate-ping'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${s.text}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function ServiceStatusCard({
  icon: Icon,
  name,
  subtitle,
  ok,
  detail,
}: {
  icon: typeof Database
  name: string
  subtitle: string
  ok: boolean
  detail?: string
}) {
  return (
    <Card className="group relative overflow-hidden border-border transition-all duration-200 hover:shadow-md">
      {/* top accent bar */}
      <div className={`absolute inset-x-0 top-0 h-1 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <CardContent className="flex items-center gap-4 p-5 pt-6">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
            ok
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge
            variant="outline"
            className={
              ok
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600'
                : 'border-red-500/30 bg-red-500/5 text-red-600'
            }
          >
            {ok ? (
              <>
                <CheckCircle2 className="mr-1 h-3 w-3" /> Hoạt động
              </>
            ) : (
              <>
                <AlertTriangle className="mr-1 h-3 w-3" /> Lỗi
              </>
            )}
          </Badge>
          {detail && <span className="text-[10px] text-muted-foreground">{detail}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

function RiskSignalRow({
  icon: Icon,
  label,
  value,
  variant,
}: {
  icon: typeof ShieldBan
  label: string
  value: number
  variant: 'danger' | 'warning' | 'neutral'
}) {
  const colors = {
    danger: { badge: 'destructive' as const, bar: 'bg-red-500', iconColor: 'text-red-500' },
    warning: { badge: 'destructive' as const, bar: 'bg-amber-500', iconColor: 'text-amber-500' },
    neutral: { badge: 'outline' as const, bar: 'bg-muted', iconColor: 'text-muted-foreground' },
  }

  const c = colors[variant]

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ${c.iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <Badge variant={value > 0 ? c.badge : 'outline'} className="min-w-[2rem] justify-center tabular-nums">
        {value}
      </Badge>
    </div>
  )
}

function CleanupActionRow({
  icon: Icon,
  title,
  description,
  buttonLabel,
  count,
  isPending,
  onCleanup,
}: {
  icon: typeof TimerReset
  title: string
  description: string
  buttonLabel: string
  count: number
  isPending: boolean
  onCleanup: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/50 bg-muted/30 px-4 py-4 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={count > 0 ? 'destructive' : 'outline'} className="tabular-nums">
          {count} bản ghi
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 transition-all hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-600"
          disabled={isPending || count === 0}
          onClick={onCleanup}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {buttonLabel}
        </Button>
      </div>
    </div>
  )
}

function TroubleshootingAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const items = [
    {
      icon: Mail,
      title: 'Không gửi được OTP / Email',
      steps: [
        'Kiểm tra trạng thái dịch vụ Email ở trên — phải hiển thị "Hoạt động".',
        'Nếu SMTP thiếu hoặc bị chặn, chuyển sang dùng Gmail API.',
        'Vào Settings → cập nhật Gmail API refresh token.',
        'Sau khi cấu hình, nhấn "Kiểm tra lại" để xác nhận.',
      ],
    },
    {
      icon: Users,
      title: 'Người dùng bị văng phiên liên tục',
      steps: [
        'Kiểm tra số lượng Refresh Token hết hạn trong mục "Bảo trì dữ liệu".',
        'Nhấn "Dọn token" để xóa các token quá hạn.',
        'Nếu vẫn lỗi, kiểm tra cấu hình JWT_SECRET trong Settings.',
        'Xem Audit Log để phát hiện hoạt động bất thường.',
      ],
    },
    {
      icon: KeyRound,
      title: 'Không đăng nhập Google được',
      steps: [
        'Kiểm tra trạng thái Google OAuth ở trên — phải hiển thị "Hoạt động".',
        'Nếu thiếu, vào Settings và cập nhật Client ID / Client Secret.',
        'Kiểm tra Redirect URI đã khớp với domain hiện tại.',
        'Đảm bảo Google Cloud Console đã enable APIs.',
      ],
    },
    {
      icon: Database,
      title: 'Database không kết nối được',
      steps: [
        'Kiểm tra trạng thái Database ở trên.',
        'Nếu lỗi, kiểm tra lại connection string (DATABASE_URL) trong Settings.',
        'Đảm bảo database server đang chạy và cho phép kết nối.',
        'Kiểm tra firewall / allowed IPs trên database hosting.',
      ],
    },
  ]

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const isOpen = openIndex === index
        return (
          <div
            key={index}
            className="overflow-hidden rounded-lg border border-border/50 transition-all"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <item.icon className="h-4 w-4" />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground">{item.title}</span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {isOpen && (
              <div className="border-t border-border/50 bg-muted/20 px-4 py-3">
                <ol className="space-y-2 pl-6">
                  {item.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="list-decimal text-sm text-muted-foreground">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function OwnerSettings() {
  const healthQuery = useOwnerSystemHealth()
  const cleanupRefreshMutation = useCleanupExpiredRefreshTokensMutation()
  const cleanupOtpMutation = useCleanupExpiredOtpCodesMutation()
  const health = healthQuery.data

  const sourceLabel: Record<string, string> = {
    database: 'Cấu hình từ Database',
    environment: 'Biến môi trường',
    missing: 'Chưa cấu hình',
  }

  const handleCleanupRefreshTokens = async () => {
    try {
      const result = await cleanupRefreshMutation.mutateAsync()
      toast.success(`Đã dọn ${result.deleted} refresh token hết hạn.`)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleCleanupOtpCodes = async () => {
    try {
      const result = await cleanupOtpMutation.mutateAsync()
      toast.success(`Đã dọn ${result.deleted} mã OTP hết hạn.`)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Sức khỏe hệ thống
            </h1>
            <p className="text-sm text-muted-foreground">
              Giám sát, bảo trì và xử lý sự cố hệ thống từ một nơi duy nhất.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => void healthQuery.refetch()}
          disabled={healthQuery.isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${healthQuery.isFetching ? 'animate-spin' : ''}`} />
          Kiểm tra lại
        </Button>
      </div>

      {healthQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : health ? (
        <>
          {/* Overall Status Banner */}
          <OverallStatusBanner health={health} />

          {/* Service Status Cards */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Trạng thái dịch vụ</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ServiceStatusCard
                icon={Database}
                name="Database"
                subtitle={health.database.message}
                ok={health.database.status === 'ok'}
              />
              <ServiceStatusCard
                icon={Mail}
                name="Email Service"
                subtitle={sourceLabel[health.email.source]}
                ok={health.email.smtpConfigured || health.email.gmailApiConfigured}
                detail={
                  health.email.smtpConfigured
                    ? 'SMTP'
                    : health.email.gmailApiConfigured
                      ? 'Gmail API'
                      : undefined
                }
              />
              <ServiceStatusCard
                icon={KeyRound}
                name="Google OAuth"
                subtitle={sourceLabel[health.oauth.source]}
                ok={health.oauth.googleConfigured}
              />
              <ServiceStatusCard
                icon={ShieldCheck}
                name="System Owners"
                subtitle={`${health.riskSignals.owners} tài khoản quyền cao nhất`}
                ok={health.riskSignals.owners > 0}
              />
            </div>
          </div>

          {/* Two-column: Risk Signals + Cleanup */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Risk Signals */}
            <Card className="border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Tín hiệu cảnh báo</CardTitle>
                </div>
                <CardDescription>
                  Các chỉ số giúp owner phát hiện sớm vấn đề tiềm ẩn.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <RiskSignalRow
                  icon={ShieldBan}
                  label="Người dùng bị khóa"
                  value={health.riskSignals.blockedUsers}
                  variant={health.riskSignals.blockedUsers > 0 ? 'danger' : 'neutral'}
                />
                <RiskSignalRow
                  icon={AlertTriangle}
                  label="Công việc quá hạn"
                  value={health.riskSignals.overdueTasks}
                  variant={health.riskSignals.overdueTasks > 0 ? 'warning' : 'neutral'}
                />
                <RiskSignalRow
                  icon={Mail}
                  label="Lời mời đang chờ"
                  value={health.riskSignals.pendingInvitations}
                  variant="neutral"
                />
                <RiskSignalRow
                  icon={ShieldCheck}
                  label="Tài khoản Owner"
                  value={health.riskSignals.owners}
                  variant="neutral"
                />
              </CardContent>
            </Card>

            {/* Cleanup / Maintenance */}
            <Card className="border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Bảo trì dữ liệu</CardTitle>
                </div>
                <CardDescription>
                  Dọn dẹp dữ liệu hết hạn để giữ database sạch và hiệu suất ổn định.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <CleanupActionRow
                  icon={TimerReset}
                  title="Refresh Token hết hạn"
                  description={`Active: ${health.sessions.activeRefreshTokens} · Hết hạn: ${health.sessions.expiredRefreshTokens}`}
                  buttonLabel="Dọn token"
                  count={health.sessions.expiredRefreshTokens}
                  isPending={cleanupRefreshMutation.isPending}
                  onCleanup={handleCleanupRefreshTokens}
                />
                <CleanupActionRow
                  icon={KeyRound}
                  title="Mã OTP hết hạn"
                  description={`Mã OTP quá hạn còn trong hệ thống`}
                  buttonLabel="Dọn OTP"
                  count={health.cleanup.expiredOtpCodes}
                  isPending={cleanupOtpMutation.isPending}
                  onCleanup={handleCleanupOtpCodes}
                />
              </CardContent>
            </Card>
          </div>

          {/* Troubleshooting Guide */}
          <Card className="border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base">Hướng dẫn xử lý sự cố</CardTitle>
              </div>
              <CardDescription>
                Chọn một vấn đề để xem các bước xử lý chi tiết.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TroubleshootingAccordion />
            </CardContent>
          </Card>

          {/* Last Checked */}
          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            Lần kiểm tra gần nhất: {new Date(health.generatedAt).toLocaleString('vi-VN')}
          </div>
        </>
      ) : (
        <Card className="border-border">
          <CardContent className="flex items-center justify-center gap-3 p-12 text-muted-foreground">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Không tải được trạng thái hệ thống. Vui lòng thử lại.</span>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
