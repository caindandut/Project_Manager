export interface ApiErrorDetail {
  code: string
  message: string
  details?: unknown
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiErrorDetail
}

export interface PaginatedMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface CursorMeta {
  cursor?: string
  limit: number
  hasMore: boolean
  total?: number
  unreadCount?: number
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  meta?: PaginatedMeta
}

export type CursorResponse<T> = ApiResponse<T[]> & {
  meta?: CursorMeta
}
