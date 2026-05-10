import { X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/useDebounce"
import { cn } from "@/lib/utils"
import type { TaskColumn, TaskFilter } from "./task.types"

const DEFAULT_COLUMNS: TaskColumn[] = [
  { key: "code", label: "Mã CV", visible: true },
  { key: "title", label: "Tiêu đề", visible: true },
  { key: "status", label: "Trạng thái", visible: true },
  { key: "priority", label: "Mức ưu tiên", visible: true },
  { key: "assignee", label: "Người phụ trách", visible: true },
  { key: "dueDate", label: "Ngày hết hạn", visible: true },
  { key: "actions", label: "Thao tác", visible: true },
]

interface ColumnToggleProps {
  columns: TaskColumn[]
  onChange: (columns: TaskColumn[]) => void
}

export function ColumnToggle({ columns, onChange }: ColumnToggleProps) {
  const toggleColumn = (key: string) => {
    onChange(
      columns.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col,
      ),
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 3v18M3 12h18M8 8l4 4-4 4M16 16l-4-4 4-4" />
          </svg>
          Cột
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">Hiển thị cột</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.key}
            className="text-sm"
            checked={col.visible}
            onCheckedChange={() => toggleColumn(col.key)}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface TaskToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  filters: TaskFilter
  onFiltersChange: (filters: TaskFilter) => void
  onCreateClick: () => void
  columns: TaskColumn[]
  onColumnsChange: (columns: TaskColumn[]) => void
  viewMode: "flat" | "grouped" | "kanban"
  onViewModeChange: (mode: "flat" | "grouped" | "kanban") => void
  totalTasks: number
}

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "TODO", label: "Việc cần làm" },
  { value: "IN_PROGRESS", label: "Đang tiến hành" },
  { value: "REVIEW", label: "Xem xét" },
  { value: "DONE", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
]

const PRIORITY_OPTIONS = [
  { value: "", label: "Tất cả mức ưu tiên" },
  { value: "HIGHEST", label: "Cao nhất" },
  { value: "HIGH", label: "Cao" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "LOW", label: "Thấp" },
  { value: "LOWEST", label: "Thấp nhất" },
]

export function TaskToolbar({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  onCreateClick,
  columns,
  onColumnsChange,
  viewMode,
  onViewModeChange,
  totalTasks,
}: TaskToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search)
  const debouncedSearch = useDebounce(localSearch, 300)

  // Sync debounced value to parent
  if (debouncedSearch !== search) {
    onSearchChange(debouncedSearch)
  }

  const hasFilters = filters.status || filters.priority || filters.assigneeId

  const clearFilters = () => {
    onFiltersChange({})
  }

  return (
    <div className="space-y-3">
      {/* Toolbar row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <Input
            placeholder="Tìm kiếm công việc..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={filters.status || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, status: e.target.value || undefined })
          }
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:bg-card"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={filters.priority || ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              priority: e.target.value || undefined,
            })
          }
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:bg-card"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground hover:text-foreground px-2"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Xóa bộ lọc
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              onClick={() => onViewModeChange("flat")}
              className={cn(
                "px-3 h-9 text-xs font-medium transition-colors",
                viewMode === "flat"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              Danh sách
            </button>
            <button
              onClick={() => onViewModeChange("grouped")}
              className={cn(
                "px-3 h-9 text-xs font-medium transition-colors",
                viewMode === "grouped"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              Nhóm
            </button>
            <button
              onClick={() => onViewModeChange("kanban")}
              className={cn(
                "px-3 h-9 text-xs font-medium transition-colors",
                viewMode === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              Bảng
            </button>
          </div>

          {/* Column toggle */}
          <ColumnToggle columns={columns} onChange={onColumnsChange} />

          {/* Create button */}
          <Button
            onClick={onCreateClick}
            className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-sm gap-1.5"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tạo công việc mới
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <span>
          Hiển thị <span className="font-medium text-foreground">{totalTasks}</span> công việc
        </span>
      </div>
    </div>
  )
}

export { DEFAULT_COLUMNS }
