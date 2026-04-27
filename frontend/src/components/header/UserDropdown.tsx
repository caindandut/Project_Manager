import { Link, useNavigate } from "react-router-dom"
import {
  Check,
  LogOut,
  Moon,
  Sun,
  User,
} from "lucide-react"
import { useTheme } from "next-themes"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/useAuth"

export default function UserDropdown() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const initials = (user?.name || user?.email || "U").slice(0, 2).toUpperCase()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent transition-all hover:border-border hover:bg-accent"
          aria-label="User menu"
        >
          <Avatar className="h-8 w-8">
            {user?.avatar ? (
              <AvatarImage src={user.avatar} alt={user.name ?? user.email} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.name || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Hồ sơ
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
          {theme === "dark" ? (
            <>
              <Sun className="mr-2 h-4 w-4" />
              Chế độ sáng
              <Check className="ml-auto h-4 w-4 text-primary" />
            </>
          ) : (
            <>
              <Moon className="mr-2 h-4 w-4" />
              Chế độ tối
              <Check className="ml-auto h-4 w-4 text-primary" />
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
