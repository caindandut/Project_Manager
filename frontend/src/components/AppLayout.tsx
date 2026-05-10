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
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onMenuClick={toggleSidebar} />

          <main className="min-h-0 flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
