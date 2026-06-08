import { useEffect, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/stores/authStore"
import {
  connectRealtime,
  disconnectRealtime,
  reconnectRealtime,
  type RealtimeEventPayload,
} from "@/lib/realtime"

interface RealtimeProviderProps {
  children: ReactNode
}

const invalidatePrefixesByEvent = (event: RealtimeEventPayload): readonly (readonly unknown[])[] => {
  const prefixes: (readonly unknown[])[] = []

  if (event.type === "notification") {
    prefixes.push(["notifications"], ["notification-preferences"])
  }

  if (event.type === "invitation") {
    prefixes.push(
      ["notifications"], 
      ["my-workspace-invitations"], 
      ["my-project-invitations"],
      ["workspace-members"],
      ["workspace-invitations"],
      ["project-members"]
    )
  }

  if (event.type === "workspace") {
    prefixes.push(
      ["workspaces"],
      ["workspace"],
      ["workspace-members"],
      ["workspace-invitations"],
      ["projects"],
      ["my-tasks"],
    )
  }

  if (event.type === "project") {
    prefixes.push(["projects"], ["project"], ["project-members"], ["my-project-invitations"], ["my-tasks"])
    if (event.projectId) {
      prefixes.push(["tasks", event.projectId])
    }
  }

  if (event.type === "user") {
    prefixes.push(
      ["auth", "me"],
      ["workspace"],
      ["workspace-members"],
      ["project"],
      ["project-members"],
      ["tasks"],
      ["task"],
      ["my-tasks"],
      ["admin"],
    )
  }

  if (event.type === "task" || event.type === "comment" || event.type === "attachment") {
    prefixes.push(["my-tasks"], ["project"], ["workspace"])
    if (event.projectId) {
      prefixes.push(["tasks", event.projectId])
    }
    if (event.taskId) {
      prefixes.push(["task", event.taskId])
    }
  }

  if (event.type === "admin") {
    prefixes.push(["admin"], ["auth", "me"])
  }

  if (event.type === "workspace" || event.type === "project" || event.type === "admin") {
    prefixes.push(["admin"])
  }

  return prefixes
}

export default function RealtimeProvider({ children }: RealtimeProviderProps) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      disconnectRealtime()
      return
    }

    const socket = connectRealtime(accessToken)

    const handleRealtimeEvent = (event: RealtimeEventPayload) => {
      const prefixes = invalidatePrefixesByEvent(event)
      for (const queryKey of prefixes) {
        void queryClient.invalidateQueries({ queryKey })
      }

      if (event.type === "invitation" && event.action === "accepted") {
        reconnectRealtime()
      }
    }

    socket.on("realtime:event", handleRealtimeEvent)

    return () => {
      socket.off("realtime:event", handleRealtimeEvent)
    }
  }, [accessToken, isAuthenticated, queryClient])

  useEffect(() => {
    return () => {
      disconnectRealtime()
    }
  }, [])

  return <>{children}</>
}
