export interface TaskColumn {
  key: string
  label: string
  visible: boolean
}

export interface TaskFilter {
  status?: string
  priority?: string
  assigneeId?: number
  titleContains?: string
}
