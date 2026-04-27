import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import ThemeToggle from '@/components/ThemeToggle'
import { Layers } from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Theme toggle */}
      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle compact />
      </div>

      {/* Logo */}
      <div className="absolute left-6 top-6 z-10">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <Layers className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Project Manager</span>
        </Link>
      </div>

      {/* Main content */}
      <div className="flex min-h-screen items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}
