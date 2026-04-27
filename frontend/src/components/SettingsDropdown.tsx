import { Link } from "react-router-dom"
import { Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SettingsDropdownProps {
  className?: string
}

export default function SettingsDropdown({ className }: SettingsDropdownProps) {
  return (
    <Button
      render={<Link to="/settings" />}
      type="button"
      variant="outline"
      size="icon-sm"
      className={cn("border-border/80 bg-background hover:bg-accent", className)}
      aria-label="Cài đặt hệ thống"
      title="Cài đặt hệ thống"
    >
      <Settings className="h-4 w-4" />
    </Button>
  )
}
