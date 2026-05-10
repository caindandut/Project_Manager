import { useState, useRef, useEffect } from "react"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"

interface QuickAddTaskProps {
  status: string
  onAdd: (title: string) => Promise<void>
}

export function QuickAddTask({ status: _status, onAdd }: QuickAddTaskProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const handleSubmit = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setIsAdding(false)
      return
    }

    setIsSubmitting(true)
    try {
      await onAdd(trimmedTitle)
      toast.success("Đã tạo công việc mới")
      setTitle("")
      inputRef.current?.focus()
    } catch {
      toast.error("Không thể tạo công việc")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === "Escape") {
      setIsAdding(false)
      setTitle("")
    }
  }

  const handleCancel = () => {
    setIsAdding(false)
    setTitle("")
  }

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 rounded-md transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Mục công việc mới</span>
      </button>
    )
  }

  return (
    <div className="p-2">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nhập tiêu đề công việc..."
        className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-card"
        disabled={isSubmitting}
      />
      <div className="flex items-center gap-1 mt-2">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || isSubmitting}
          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Thêm
        </button>
        <button
          onClick={handleCancel}
          className="p-1 text-muted-foreground/60 hover:text-muted-foreground rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
