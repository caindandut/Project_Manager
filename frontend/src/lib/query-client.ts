import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export const taskQueryKeys = {
  list: (projectId: number, filters?: Record<string, unknown>) =>
    ["tasks", projectId, filters ?? {}] as const,
  detail: (taskId: number) => ["task", taskId] as const,
}

export default queryClient
