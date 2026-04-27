import { Link } from "react-router-dom"
import { Bell, Gear, Menu, Search, Settings, X } from "lucide-react"
import { useState } from "react"

import NotificationBell from "@/components/NotificationBell"
import UserDropdown from "./UserDropdown"
import WorkspaceDropdown from "./WorkspaceDropdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AppHeaderProps {
  onMenuClick?: () => void
  isSidebarOpen?: boolean
}

export default function AppHeader({ onMenuClick, isSidebarOpen }: AppHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center gap-4 border-b bg-background px-4">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden"
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
            placeholder="Tìm kiếm công việc, dự án..."
            className="h-9 w-full pl-10 bg-muted/50 border-0 focus:bg-background"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
            <span className="text-xs">/</span>
          </kbd>
        </div>
      </div>

      {/* Mobile search toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden"
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
        <NotificationBell unreadCount={0} />
        
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          asChild
        >
          <Link to="/settings" aria-label="Cài đặt">
            <Gear className="h-4 w-4" />
          </Link>
        </Button>
        
        <UserDropdown />
      </div>
    </header>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}
