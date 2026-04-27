import { Link } from "react-router-dom"
import { Menu, Search, Settings, X } from "lucide-react"
import { useState } from "react"

import NotificationBell from "@/components/NotificationBell"
import UserDropdown from "./UserDropdown"
import WorkspaceDropdown from "./WorkspaceDropdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AppHeaderProps {
  onMenuClick?: () => void
}

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center gap-4 border-b bg-white px-4 shadow-sm">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden text-[#5E6C84] hover:bg-[#EBECF0] hover:text-[#172B4D]"
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E6C84]" />
          <Input
            type="search"
            placeholder="Tìm kiếm công việc..."
            className="h-9 w-full pl-10 bg-[#F4F5F7] border-0 rounded text-sm focus:bg-white focus:ring-2 focus:ring-[#0052CC]/20"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[#DFE1E6] bg-[#F4F5F7] px-1.5 font-mono text-xs text-[#5E6C84]">
            <span className="text-xs">/</span>
          </kbd>
        </div>
      </div>

      {/* Mobile search toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden text-[#5E6C84] hover:bg-[#EBECF0] hover:text-[#172B4D]"
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
        
        <Link
          to="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-md text-[#5E6C84] hover:bg-[#EBECF0] hover:text-[#172B4D] transition-colors"
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
