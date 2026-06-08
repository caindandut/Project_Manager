import { create } from "zustand"
import { io, type Socket } from "socket.io-client"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
const REALTIME_URL = import.meta.env.VITE_REALTIME_URL || API_BASE_URL.replace(/\/api\/v1\/?$/, "")

export type RealtimeEntityType =
  | "workspace"
  | "project"
  | "task"
  | "comment"
  | "attachment"
  | "notification"
  | "invitation"
  | "user"
  | "admin"

export type RealtimeAction =
  | "created"
  | "updated"
  | "deleted"
  | "accepted"
  | "declined"
  | "cancelled"
  | "read"
  | "cleared"
  | "restored"

export interface RealtimeEventPayload {
  type: RealtimeEntityType
  action: RealtimeAction
  entityId: number
  workspaceId?: number
  projectId?: number
  taskId?: number
  actorId?: number
  userId?: number
  timestamp: string
}

interface RealtimeState {
  isConnected: boolean
  setConnected: (isConnected: boolean) => void
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  isConnected: false,
  setConnected: (isConnected) => set({ isConnected }),
}))

let socket: Socket | null = null
let activeToken: string | null = null

export const getRealtimeSocket = (): Socket | null => socket

export const connectRealtime = (token: string): Socket => {
  if (socket && activeToken === token) {
    if (!socket.connected) {
      socket.connect()
    }
    return socket
  }

  disconnectRealtime()
  activeToken = token
  socket = io(REALTIME_URL, {
    auth: { token },
    autoConnect: true,
    transports: ["websocket", "polling"],
    withCredentials: true,
  })

  socket.on("connect", () => {
    useRealtimeStore.getState().setConnected(true)
  })

  socket.on("disconnect", () => {
    useRealtimeStore.getState().setConnected(false)
  })

  socket.on("connect_error", () => {
    useRealtimeStore.getState().setConnected(false)
  })

  return socket
}

export const reconnectRealtime = (): void => {
  if (!socket) return
  socket.disconnect()
  socket.connect()
}

export const disconnectRealtime = (): void => {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
  }
  socket = null
  activeToken = null
  useRealtimeStore.getState().setConnected(false)
}
