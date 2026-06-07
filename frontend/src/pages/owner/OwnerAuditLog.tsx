import { useState } from 'react'
import { Clock, Settings, ShieldBan, ShieldCheck, UserCog, Trash2, UserPlus, Building2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminAuditLogs, useAdminRecentActivity } from '@/hooks/useAdmin'

const actionIcons: Record<string, typeof ShieldCheck> = {
  USER_BLOCKED: ShieldBan,
  USER_UNBLOCKED: ShieldCheck,
  USER_ROLE_CHANGED: UserCog,
  SETTINGS_UPDATED: Settings,
  MAINTENANCE_OTP_CODES_CLEANED: Trash2,
  MAINTENANCE_REFRESH_TOKENS_CLEANED: Trash2,
}

const actionLabels: Record<string, string> = {
  USER_BLOCKED: 'Khóa tài khoản',
  USER_UNBLOCKED: 'Mở khóa tài khoản',
  USER_ROLE_CHANGED: 'Đổi quyền hệ thống',
  SETTINGS_UPDATED: 'Cập nhật cấu hình',
  MAINTENANCE_OTP_CODES_CLEANED: 'Dọn dẹp mã OTP',
  MAINTENANCE_REFRESH_TOKENS_CLEANED: 'Dọn dẹp Token',
}

const translateDescription = (action: string, description: string) => {
  switch(action) {
    case 'USER_BLOCKED':
      return description.replace('Blocked user', 'Đã khóa người dùng');
    case 'USER_UNBLOCKED':
      return description.replace('Unblocked user', 'Đã mở khóa người dùng');
    case 'USER_ROLE_CHANGED':
      return description.replace('Changed role of', 'Đã đổi quyền của').replace('from', 'từ').replace('to', 'thành');
    case 'SETTINGS_UPDATED':
      return description.replace('Updated settings:', 'Đã cập nhật cấu hình:');
    case 'MAINTENANCE_OTP_CODES_CLEANED':
      return description.replace(/Cleaned (\d+) expired OTP codes/, 'Đã dọn dẹp $1 mã OTP hết hạn');
    case 'MAINTENANCE_REFRESH_TOKENS_CLEANED':
      return description.replace(/Cleaned (\d+) expired refresh tokens/, 'Đã dọn dẹp $1 refresh token hết hạn');
    default:
      return description;
  }
}

const getAvatarUrl = (avatarPath?: string | null) => {
  if (!avatarPath) return undefined
  if (avatarPath.startsWith('http')) return avatarPath
  const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/v1', '') : 'http://localhost:5000'
  return `${base}${avatarPath}`
}

export default function OwnerAuditLog() {
  const [page, setPage] = useState(1)
  const limit = 20

  const logsQuery = useAdminAuditLogs({
    page,
    limit,
  })
  const totalPages = logsQuery.data?.meta.totalPages ?? 1

  const systemActivityQuery = useAdminRecentActivity(50)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Nhật ký hệ thống</h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi các hoạt động bảo mật của Owner và hoạt động đăng ký, workspace trên hệ thống.
        </p>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            Hoạt động của Owner
            <span className="text-sm font-normal text-muted-foreground">{logsQuery.data?.meta.total ?? 0} bản ghi</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.data?.data.length ? (
                  logsQuery.data.data.map((log) => {
                    const Icon = actionIcons[log.action] ?? Clock
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <Icon className="h-4 w-4" />
                            </div>
                            <Badge variant="outline">{actionLabels[log.action] ?? log.action}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[420px]">
                          <p className="truncate text-sm" title={translateDescription(log.action, log.description)}>{translateDescription(log.action, log.description)}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={getAvatarUrl(log.performedBy.avatar)} />
                              <AvatarFallback>{log.performedBy.name?.charAt(0)?.toUpperCase() ?? '?'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm">{log.performedBy.name}</p>
                              <p className="text-xs text-muted-foreground">{log.performedBy.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Chưa có bản ghi audit.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t p-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Trước
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
              Sau
            </Button>
          </div>
        )}
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            Hoạt động gần đây của hệ thống
            <span className="text-sm font-normal text-muted-foreground">
              {(systemActivityQuery.data ?? []).length} hoạt động gần đây
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {systemActivityQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(systemActivityQuery.data ?? []).length ? (
                  (systemActivityQuery.data ?? []).map((activity) => {
                    const isUser = activity.type === 'USER_REGISTERED'
                    const Icon = isUser ? UserPlus : Building2
                    return (
                      <TableRow key={`${activity.type}-${activity.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-md ${isUser ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <Badge variant="outline" className={isUser ? 'border-blue-500/30 text-blue-600' : 'border-emerald-500/30 text-emerald-600'}>
                              {isUser ? 'Đăng ký mới' : 'Workspace mới'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{activity.description}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleString('vi-VN')}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Chưa có hoạt động hệ thống nào.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
