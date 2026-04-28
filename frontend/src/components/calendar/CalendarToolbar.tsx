import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { CalendarViewMode } from "@/lib/calendar-utils"
import type { TaskUser } from "@/types/task"

interface CalendarToolbarProps {
  title: string
  viewMode: CalendarViewMode
  onViewModeChange: (mode: CalendarViewMode) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  // Filters
  priorityFilter: string[]
  onPriorityFilterChange: (priorities: string[]) => void
  assigneeFilter: number[]
  onAssigneeFilterChange: (assigneeIds: number[]) => void
  projectMembers: TaskUser[]
}

const PRIORITY_OPTIONS = [
  { value: "HIGHEST", label: "Cao nhất", color: "#DC2626" },
  { value: "HIGH", label: "Cao", color: "#F97316" },
  { value: "MEDIUM", label: "Trung bình", color: "#F59E0B" },
  { value: "LOW", label: "Thấp", color: "#3B82F6" },
  { value: "LOWEST", label: "Thấp nhất", color: "#9CA3AF" },
]

const VIEW_LABELS: Record<CalendarViewMode, string> = {
  month: "Tháng",
  week: "Tuần",
  day: "Ngày",
}

export function CalendarToolbar({
  title,
  viewMode,
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
  priorityFilter,
  onPriorityFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  projectMembers,
}: CalendarToolbarProps) {
  const hasActiveFilters = priorityFilter.length > 0 || assigneeFilter.length > 0
  const totalFilters = priorityFilter.length + assigneeFilter.length

  const togglePriority = (priority: string) => {
    if (priorityFilter.includes(priority)) {
      onPriorityFilterChange(priorityFilter.filter((p) => p !== priority))
    } else {
      onPriorityFilterChange([...priorityFilter, priority])
    }
  }

  const toggleAssignee = (assigneeId: number) => {
    if (assigneeFilter.includes(assigneeId)) {
      onAssigneeFilterChange(assigneeFilter.filter((id) => id !== assigneeId))
    } else {
      onAssigneeFilterChange([...assigneeFilter, assigneeId])
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 pb-4">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-border/60 bg-card overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none border-r border-border/40 hover:bg-muted"
            onClick={onPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none hover:bg-muted"
            onClick={onNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold text-foreground capitalize ml-1">
          {title}
        </h2>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium ml-2"
          onClick={onToday}
        >
          Hôm nay
        </Button>
      </div>

      {/* Right: View mode + Filters */}
      <div className="flex items-center gap-2">
        {/* Filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-xs gap-1.5",
                hasActiveFilters && "border-primary/40 bg-primary/5 text-primary"
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Lọc
              {totalFilters > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {totalFilters}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">Mức ưu tiên</DropdownMenuLabel>
            {PRIORITY_OPTIONS.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={priorityFilter.includes(opt.value)}
                onCheckedChange={() => togglePriority(opt.value)}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                  {opt.label}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Người phụ trách</DropdownMenuLabel>
            {projectMembers.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Không có thành viên
              </div>
            ) : (
              projectMembers.map((member) => (
                <DropdownMenuCheckboxItem
                  key={member.id}
                  checked={assigneeFilter.includes(member.id)}
                  onCheckedChange={() => toggleAssignee(member.id)}
                >
                  <span className="flex items-center gap-2">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={member.avatar ?? undefined} />
                      <AvatarFallback className="text-[8px]">
                        {(member.name ?? member.email)?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{member.name ?? member.email}</span>
                  </span>
                </DropdownMenuCheckboxItem>
              ))
            )}
            {hasActiveFilters && (
              <>
                <DropdownMenuSeparator />
                <button
                  onClick={() => {
                    onPriorityFilterChange([])
                    onAssigneeFilterChange([])
                  }}
                  className="w-full px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-sm transition-colors text-left"
                >
                  Xóa tất cả bộ lọc
                </button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View mode selector */}
        <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as CalendarViewMode)}>
          <SelectTrigger className="h-8 w-[100px] text-xs">
            <CalendarIcon className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(VIEW_LABELS) as CalendarViewMode[]).map((mode) => (
              <SelectItem key={mode} value={mode} className="text-xs">
                {VIEW_LABELS[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
