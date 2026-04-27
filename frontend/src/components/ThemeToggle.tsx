import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

interface ThemeToggleProps {
  compact?: boolean
}

export default function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size={compact ? "icon-sm" : "sm"} disabled>
        <Sun className="h-4 w-4" />
        {!compact ? <span>Đang tải giao diện</span> : null}
      </Button>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      title={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact ? <span>{isDark ? "Giao diện sáng" : "Giao diện tối"}</span> : null}
    </Button>
  )
}
