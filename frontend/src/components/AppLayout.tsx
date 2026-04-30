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
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        <AppHeader onMenuClick={toggleSidebar} />

        <div className="flex flex-1 min-h-0 pt-14">
          <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

          <main className="flex-1 h-full overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
