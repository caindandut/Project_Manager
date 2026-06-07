import { useState } from 'react'
import { Eye, MoreHorizontal, Search, ShieldBan, ShieldCheck, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
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
import {
  useAdminUserDetail,
  useAdminUsers,
  useUpdateUserRoleMutation,
  useUpdateUserStatusMutation,
} from '@/hooks/useAdmin'
import { useDebounce } from '@/hooks/useDebounce'
import type { AdminUserItem } from '@/types/admin'

const getAvatarUrl = (avatarPath?: string | null) => {
  if (!avatarPath) return undefined
  if (avatarPath.startsWith('http')) return avatarPath
  const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/v1', '') : 'http://localhost:5000'
  return `${base}${avatarPath}`
}

export default function OwnerUsers() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const debouncedSearch = useDebounce(search, 350)
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
  const totalPages = usersQuery.data?.meta.totalPages ?? 1

  const handleToggleStatus = async (user: AdminUserItem) => {
    try {
      await statusMutation.mutateAsync({ userId: user.id, isBlocked: !user.isBlocked })
      toast.success(user.isBlocked ? `Đã mở khóa ${user.name}` : `Đã khóa ${user.name}`)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleChangeRole = async (user: AdminUserItem) => {
    const nextRole = user.systemRole === 'OWNER' ? 'USER' : 'OWNER'
    try {
      await roleMutation.mutateAsync({ userId: user.id, role: nextRole })
      toast.success(`Đã đổi ${user.name} thành ${nextRole}`)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">User Governance</h1>
        <p className="text-sm text-muted-foreground">
          Owner quản lý tài khoản hệ thống, phân quyền OWNER và trạng thái truy cập.
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Tìm theo tên hoặc email..."
              className="h-9 pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1) }}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi trạng thái</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="blocked">Bị khóa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={(value) => { setRoleFilter(value); setPage(1) }}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi vai trò</SelectItem>
              <SelectItem value="OWNER">Owner</SelectItem>
              <SelectItem value="USER">User</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            Danh sách người dùng
            <span className="text-sm font-normal text-muted-foreground">
              {usersQuery.data?.meta.total ?? 0} tài khoản
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usersQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Vai trò hệ thống</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Workspaces</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.data?.data.length ? (
                  usersQuery.data.data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={getAvatarUrl(user.avatar)} />
                            <AvatarFallback>{user.name?.charAt(0)?.toUpperCase() ?? '?'}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.systemRole === 'OWNER' ? 'default' : 'secondary'}>
                          {user.systemRole === 'OWNER' ? 'OWNER' : 'USER'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isBlocked ? (
                          <Badge variant="destructive">Bị khóa</Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
                            Hoạt động
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user._count?.memberships ?? 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
                                <><ShieldBan className="mr-2 h-4 w-4" /> Khóa tài khoản</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(user)}>
                              <UserCog className="mr-2 h-4 w-4" />
                              Đổi thành {user.systemRole === 'OWNER' ? 'USER' : 'OWNER'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Không có người dùng phù hợp.
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

      <Dialog open={Boolean(selectedUserId)} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết người dùng</DialogTitle>
            <DialogDescription>Quyền hệ thống, workspace và dự án người này đang tham gia.</DialogDescription>
          </DialogHeader>

          {userDetailQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : userDetailQuery.data ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={getAvatarUrl(userDetailQuery.data.avatar)} />
                  <AvatarFallback>{userDetailQuery.data.name?.charAt(0)?.toUpperCase() ?? '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{userDetailQuery.data.name}</p>
                  <p className="text-sm text-muted-foreground">{userDetailQuery.data.email}</p>
                  <div className="mt-1 flex gap-2">
                    <Badge>{userDetailQuery.data.systemRole}</Badge>
                    {userDetailQuery.data.isBlocked && <Badge variant="destructive">Bị khóa</Badge>}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Workspaces ({userDetailQuery.data.workspaces.length})</p>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {userDetailQuery.data.workspaces.length ? (
                      userDetailQuery.data.workspaces.map((workspace) => (
                        <div key={workspace.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <span className="text-sm">{workspace.name}</span>
                          <Badge variant="outline">{workspace.role}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Chưa tham gia workspace.</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Dự án ({userDetailQuery.data.projects.length})</p>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {userDetailQuery.data.projects.length ? (
                      userDetailQuery.data.projects.map((project) => (
                        <div key={project.id} className="rounded-md border px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{project.key}</span>
                            <Badge variant="outline">{project.role}</Badge>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{project.name} · {project.workspaceName}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Chưa tham gia dự án.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
