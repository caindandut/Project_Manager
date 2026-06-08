import { Link } from "react-router-dom"
import { Menu, Moon, Search, ShieldCheck, Sun, X } from "lucide-react"
import { useState } from "react"
import { useTheme } from "next-themes"

import NotificationBell from "@/components/NotificationBell"
import UserDropdown from "./UserDropdown"
import WorkspaceDropdown from "./WorkspaceDropdown"
import HeaderSearch from "./HeaderSearch"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/authStore"
import { useLocation } from "react-router-dom"

interface AppHeaderProps {
  onMenuClick?: () => void
}

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const { theme, setTheme } = useTheme()
  const location = useLocation()

  // Extract workspaceSlug from URL path (e.g. /workspaces/my-slug/...)
  const match = location.pathname.match(/^\/workspaces\/([^/]+)/)
  const workspaceSlug = match ? match[1] : undefined

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
        {workspaceSlug ? (
          <HeaderSearch workspaceSlug={workspaceSlug} />
        ) : (
          <div className="w-full max-w-xl" /> // Placeholder to keep spacing
        )}
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
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          title={theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <NotificationBell />

        {/* Owner Console - only visible for system OWNER */}
        {user?.systemRole === 'OWNER' && (
          <Link
            to="/owner"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Owner Console"
            title="Owner Console"
          >
            <ShieldCheck className="h-4 w-4" />
          </Link>
        )}
        
        <UserDropdown />
      </div>
    </header>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}
