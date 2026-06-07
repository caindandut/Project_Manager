import { NavLink, Outlet } from 'react-router-dom'
import {
  Activity,
  Building2,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'

const navItems = [
  { to: '/owner', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/owner/users', label: 'Người dùng', icon: Users },
  { to: '/owner/oversight', label: 'Workspace & dự án', icon: Building2 },
  { to: '/owner/settings', label: 'Health', icon: Settings },
  { to: '/owner/audit-logs', label: 'Nhật ký', icon: FileText },
]

export default function OwnerLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-72 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Owner Console</p>
            <p className="text-xs text-muted-foreground">Quản trị hệ thống</p>
          </div>
        </div>

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


      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <Activity className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">Owner Console</span>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b bg-card px-3 lg:hidden">
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

        <main className="min-h-0 flex-1 overflow-auto bg-muted/20">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
