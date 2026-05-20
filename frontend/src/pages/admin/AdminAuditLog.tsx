import { useState } from 'react'
import {
  ShieldCheck,
  ShieldBan,
  UserCog,
  Settings,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
}

const actionLabels: Record<string, string> = {
  USER_BLOCKED: 'Khóa tài khoản',
  USER_UNBLOCKED: 'Mở khóa tài khoản',
  USER_ROLE_CHANGED: 'Đổi vai trò',
  SETTINGS_UPDATED: 'Cập nhật cài đặt',
}

const actionColors: Record<string, string> = {
  USER_BLOCKED: 'text-red-500 bg-red-500/10',
  USER_UNBLOCKED: 'text-emerald-500 bg-emerald-500/10',
  USER_ROLE_CHANGED: 'text-violet-500 bg-violet-500/10',
  SETTINGS_UPDATED: 'text-blue-500 bg-blue-500/10',
}

export default function AdminAuditLog() {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState<string>('all')
  const limit = 20

  const logsQuery = useAdminAuditLogs({
    page,
    limit,
    action: actionFilter === 'all' ? undefined : actionFilter,
  })

  const totalPages = logsQuery.data?.meta?.totalPages ?? 1

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nhật ký hệ thống</h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi tất cả hành động quản trị đã thực hiện.
        </p>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="flex items-center gap-3 p-4">
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue placeholder="Loại hành động" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="USER_BLOCKED">Khóa tài khoản</SelectItem>
              <SelectItem value="USER_UNBLOCKED">Mở khóa tài khoản</SelectItem>
              <SelectItem value="USER_ROLE_CHANGED">Đổi vai trò</SelectItem>
              <SelectItem value="SETTINGS_UPDATED">Cập nhật cài đặt</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Lịch sử hành động</span>
            {logsQuery.data?.meta && (
              <span className="text-sm font-normal text-muted-foreground">
                {logsQuery.data.meta.total} bản ghi
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Hành động</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Thực hiện bởi</TableHead>
                  <TableHead className="w-[180px]">Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Chưa có bản ghi nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  logsQuery.data?.data.map((log) => {
                    const Icon = actionIcons[log.action] ?? Clock
                    const colorClass = actionColors[log.action] ?? 'text-muted-foreground bg-muted'

                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-md ${colorClass}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {actionLabels[log.action] ?? log.action}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">{log.description}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={log.performedBy.avatar ? `http://localhost:5000${log.performedBy.avatar}` : undefined} />
                              <AvatarFallback className="text-[10px]">
                                {log.performedBy.name?.charAt(0)?.toUpperCase() ?? '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground">{log.performedBy.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.createdAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-border p-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
