import { Outlet } from "react-router-dom"
import { useState } from "react"

import AppHeader from "@/components/header/AppHeader"
import AppSidebar from "@/components/sidebar/AppSidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <AppHeader onMenuClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />

        <div className="flex">
          <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
