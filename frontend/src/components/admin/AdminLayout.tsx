import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react'


const navItems = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/settings', label: 'Cài đặt', icon: Settings },
  { to: '/admin/audit-logs', label: 'Nhật ký', icon: FileText },
]

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card lg:flex">
        {/* Header */}
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">Quản trị hệ thống</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Back to workspace */}
        <div className="border-t border-border p-3">
          <a
            href="/"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay về ứng dụng</span>
          </a>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">Quản trị hệ thống</span>
          <div className="ml-auto">
            <a
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </a>
          </div>
        </header>

        {/* Mobile nav tabs */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Page content */}
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
