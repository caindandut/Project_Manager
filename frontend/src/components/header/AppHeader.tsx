import { Link } from "react-router-dom"
import { Menu, Search, Settings, ShieldCheck, X } from "lucide-react"
import { useState } from "react"

import NotificationBell from "@/components/NotificationBell"
import UserDropdown from "./UserDropdown"
import WorkspaceDropdown from "./WorkspaceDropdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/stores/authStore"

interface AppHeaderProps {
  onMenuClick?: () => void
}

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const user = useAuthStore((s) => s.user)

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center gap-4 border-b border-border bg-card px-4 shadow-sm dark:shadow-jira-card-dark">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Workspace Dropdown */}
      <WorkspaceDropdown />

      {/* Search Bar - Center */}
      <div className={cn(
        "flex-1 mx-4",
        isSearchOpen ? "flex" : "hidden md:flex"
      )}>
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm công việc..."
            className="h-9 w-full rounded border-border bg-muted/70 pl-10 text-sm focus:bg-background focus:ring-2 focus:ring-primary/20 dark:bg-background dark:focus:bg-card"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden h-5 items-center gap-1 rounded border border-border bg-muted/70 px-1.5 font-mono text-xs text-muted-foreground sm:inline-flex">
            <span className="text-xs">/</span>
          </kbd>
        </div>
      </div>

      {/* Mobile search toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => setIsSearchOpen(!isSearchOpen)}
        aria-label="Toggle search"
      >
        {isSearchOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Search className="h-5 w-5" />
        )}
      </Button>

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />

        {/* Admin Panel - only visible for OWNER */}
        {user?.systemRole === 'OWNER' && (
          <Link
            to="/admin"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Quản trị hệ thống"
            title="Quản trị hệ thống"
          >
            <ShieldCheck className="h-4 w-4" />
          </Link>
        )}
        
        <Link
          to="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Cài đặt"
        >
          <Settings className="h-4 w-4" />
        </Link>
        
        <UserDropdown />
      </div>
    </header>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}
