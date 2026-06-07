import { useState } from 'react'
import { Clock, Settings, ShieldBan, ShieldCheck, UserCog, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminAuditLogs } from '@/hooks/useAdmin'

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
  const [actionFilter, setActionFilter] = useState('all')
  const limit = 20
  const logsQuery = useAdminAuditLogs({
    page,
    limit,
    action: actionFilter === 'all' ? undefined : actionFilter,
  })
  const totalPages = logsQuery.data?.meta.totalPages ?? 1

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Audit & Security Log</h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi các thao tác nhạy cảm do Owner thực hiện trên hệ thống.
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-4">
          <Select value={actionFilter} onValueChange={(value) => { setActionFilter(value); setPage(1) }}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi hành động</SelectItem>
              <SelectItem value="USER_BLOCKED">Khóa tài khoản</SelectItem>
              <SelectItem value="USER_UNBLOCKED">Mở khóa tài khoản</SelectItem>
              <SelectItem value="USER_ROLE_CHANGED">Đổi quyền hệ thống</SelectItem>
              <SelectItem value="SETTINGS_UPDATED">Cập nhật cấu hình</SelectItem>
              <SelectItem value="MAINTENANCE_OTP_CODES_CLEANED">Dọn dẹp mã OTP</SelectItem>
              <SelectItem value="MAINTENANCE_REFRESH_TOKENS_CLEANED">Dọn dẹp Token</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            Nhật ký Owner
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
    </div>
  )
}
