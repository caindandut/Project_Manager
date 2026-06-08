import { useState, useRef, useEffect } from "react"
import { Search, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/useDebounce"
import { useSearchWorkspaceTasksQuery } from "@/hooks/useWorkspaces"
import { cn } from "@/lib/utils"

interface HeaderSearchProps {
  workspaceSlug?: string
  className?: string
}

export default function HeaderSearch({ workspaceSlug, className }: HeaderSearchProps) {
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: searchResults, isLoading } = useSearchWorkspaceTasksQuery(
    workspaceSlug || "",
    debouncedQuery
  )

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleTaskClick = (projectId: number, taskId: number) => {
    setIsFocused(false)
    setQuery("")
    if (workspaceSlug) {
      navigate(`/workspaces/${workspaceSlug}/projects/${projectId}/overview?task=${taskId}`)
    }
  }

  // Only render if we have a workspace
  if (!workspaceSlug) {
    return null
  }

  return (
    <div className={cn("relative w-full max-w-xl", className)} ref={dropdownRef}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Tìm kiếm công việc..."
        className="h-9 w-full rounded border-border bg-muted/70 pl-10 text-sm focus:bg-background focus:ring-2 focus:ring-primary/20 dark:bg-background dark:focus:bg-card"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
      />
      {!isFocused && !query && (
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden h-5 items-center gap-1 rounded border border-border bg-muted/70 px-1.5 font-mono text-xs text-muted-foreground sm:inline-flex">
          <span className="text-xs">/</span>
        </kbd>
      )}

      {/* Dropdown Results */}
      {isFocused && query.trim().length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 z-50 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tìm kiếm...
            </div>
          ) : searchResults?.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Không tìm thấy công việc nào.
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {searchResults?.map((task: any) => (
                <li key={task.id}>
                  <button
                    className="w-full text-left flex flex-col items-start gap-1 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => handleTaskClick(task.projectId, task.id)}
                  >
                    <div className="font-medium text-sm line-clamp-1">{task.title}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span className="bg-muted px-1.5 rounded">{task.project.key}-{task.id}</span>
                      <span className="mx-2">•</span>
                      <span className="truncate">{task.project.name}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
