import { Navigate, Outlet } from 'react-router-dom'
import { LoaderCircle, ShieldAlert } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'

export default function AdminProtectedRoute() {
  const { user, isAuthenticated, isBootstrappingAuth } = useAuth()

  if (isBootstrappingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <span>Đang kiểm tra quyền...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.systemRole !== 'OWNER') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center shadow-md">
          <ShieldAlert className="h-12 w-12 text-destructive" />
          <h2 className="text-lg font-semibold text-foreground">Truy cập bị từ chối</h2>
          <p className="text-sm text-muted-foreground">
            Bạn không có quyền truy cập khu vực quản trị hệ thống.
          </p>
          <a
            href="/"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Quay về trang chính
          </a>
        </div>
      </div>
    )
  }

  return <Outlet />
}
