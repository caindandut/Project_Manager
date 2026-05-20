import { useState } from 'react'
import { Search, MoreHorizontal, ShieldCheck, ShieldBan, Eye, UserCog, X } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useAdminUsers,
  useAdminUserDetail,
  useUpdateUserStatusMutation,
  useUpdateUserRoleMutation,
} from '@/hooks/useAdmin'
import type { AdminUserItem } from '@/types/admin'
import { useDebounce } from '@/hooks/useDebounce'

export default function AdminUsers() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const debouncedSearch = useDebounce(search, 400)
  const limit = 15

  const usersQuery = useAdminUsers({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'blocked'),
    role: roleFilter === 'all' ? undefined : (roleFilter as 'OWNER' | 'USER'),
  })

  const userDetailQuery = useAdminUserDetail(selectedUserId ?? 0)
  const statusMutation = useUpdateUserStatusMutation()
  const roleMutation = useUpdateUserRoleMutation()

  const handleToggleStatus = async (user: AdminUserItem) => {
    try {
      await statusMutation.mutateAsync({
        userId: user.id,
        isBlocked: !user.isBlocked,
      })
      toast.success(user.isBlocked ? `Đã mở khóa ${user.name}` : `Đã khóa ${user.name}`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleChangeRole = async (user: AdminUserItem, newRole: 'OWNER' | 'USER') => {
    try {
      await roleMutation.mutateAsync({ userId: user.id, role: newRole })
      toast.success(`Đã đổi vai trò của ${user.name} thành ${newRole}`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const totalPages = usersQuery.data?.meta?.totalPages ?? 1

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quản lý người dùng</h1>
        <p className="text-sm text-muted-foreground">
          Xem, tìm kiếm và quản lý tài khoản người dùng.
        </p>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="h-9 pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="blocked">Bị khóa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="OWNER">Owner</SelectItem>
              <SelectItem value="USER">User</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Danh sách người dùng</span>
            {usersQuery.data?.meta && (
              <span className="text-sm font-normal text-muted-foreground">
                {usersQuery.data.meta.total} người dùng
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usersQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Người dùng</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Workspaces</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Không tìm thấy người dùng nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  usersQuery.data?.data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar ? `http://localhost:5000${user.avatar}` : undefined} />
                            <AvatarFallback className="text-xs">
                              {user.name?.charAt(0)?.toUpperCase() ?? '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.systemRole === 'OWNER' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {user.systemRole === 'OWNER' ? (
                            <><ShieldCheck className="mr-1 h-3 w-3" />Owner</>
                          ) : (
                            'User'
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isBlocked ? (
                          <Badge variant="destructive" className="text-xs">
                            <ShieldBan className="mr-1 h-3 w-3" />Khóa
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 text-xs">
                            Hoạt động
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {user._count?.memberships ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedUserId(user.id)}>
                              <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                              {user.isBlocked ? (
                                <><ShieldCheck className="mr-2 h-4 w-4" /> Mở khóa</>
                              ) : (
                                <><ShieldBan className="mr-2 h-4 w-4 text-destructive" /> Khóa tài khoản</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleChangeRole(user, user.systemRole === 'OWNER' ? 'USER' : 'OWNER')
                              }
                            >
                              <UserCog className="mr-2 h-4 w-4" />
                              Đổi thành {user.systemRole === 'OWNER' ? 'User' : 'Owner'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
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

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Chi tiết người dùng
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 w-6 p-0"
                onClick={() => setSelectedUserId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>Thông tin tài khoản và danh sách workspace.</DialogDescription>
          </DialogHeader>

          {userDetailQuery.isLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : userDetailQuery.data ? (
            <div className="space-y-4 py-2">
              {/* User info */}
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={userDetailQuery.data.avatar ? `http://localhost:5000${userDetailQuery.data.avatar}` : undefined} />
                  <AvatarFallback className="text-lg">
                    {userDetailQuery.data.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold text-foreground">{userDetailQuery.data.name}</p>
                  <p className="text-sm text-muted-foreground">{userDetailQuery.data.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={userDetailQuery.data.systemRole === 'OWNER' ? 'default' : 'secondary'} className="text-xs">
                      {userDetailQuery.data.systemRole}
                    </Badge>
                    {userDetailQuery.data.isBlocked && (
                      <Badge variant="destructive" className="text-xs">Bị khóa</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              {userDetailQuery.data.bio && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Giới thiệu</p>
                  <p className="text-sm text-foreground">{userDetailQuery.data.bio}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Ngày tạo</p>
                  <p className="text-foreground">{new Date(userDetailQuery.data.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Cập nhật</p>
                  <p className="text-foreground">{new Date(userDetailQuery.data.updatedAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              {/* Workspaces */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Workspaces ({userDetailQuery.data.workspaces.length})
                </p>
                {userDetailQuery.data.workspaces.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa tham gia workspace nào.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {userDetailQuery.data.workspaces.map((ws) => (
                      <div
                        key={ws.id}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                      >
                        <span className="text-sm text-foreground">{ws.name}</span>
                        <Badge variant="outline" className="text-xs">{ws.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
