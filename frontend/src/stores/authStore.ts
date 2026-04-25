import { create } from 'zustand'

export interface AuthUser {
  id: number
  email: string
  name?: string | null
  avatar?: string | null
  bio?: string | null
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  accessToken: string | null
  login: (payload: { user: AuthUser; accessToken: string }) => void
  logout: () => void
  setUser: (user: AuthUser | null) => void
  setAccessToken: (accessToken: string | null) => void
}

const ACCESS_TOKEN_KEY = 'accessToken'

const getInitialAccessToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: Boolean(getInitialAccessToken()),
  accessToken: getInitialAccessToken(),
  login: ({ user, accessToken }) => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)

    set({
      user,
      accessToken,
      isAuthenticated: true,
    })
  },
  logout: () => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    })
  },
  setUser: (user) =>
    set((state) => ({
      user,
      isAuthenticated: Boolean(state.accessToken && user),
    })),
  setAccessToken: (accessToken) => {
    if (accessToken) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    }

    set((state) => ({
      accessToken,
      isAuthenticated: Boolean(accessToken && state.user),
    }))
  },
}))

export { ACCESS_TOKEN_KEY }
