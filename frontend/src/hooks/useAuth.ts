import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient, { normalizeApiError, unwrapResponse } from '@/lib/api-client'
import { useAuthStore, type AuthUser } from '@/stores/authStore'
import type { ApiResponse } from '@/types/api'

interface LoginInput {
  email: string
  password: string
}

interface RegisterInput {
  email: string
  password: string
  name: string
}

interface AuthSuccessPayload {
  user: AuthUser
  accessToken: string
  expiresIn: number
}

interface GoogleAuthResult {
  accessToken: string
  user: AuthUser
}

const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const

export const useAuth = () => {
  const queryClient = useQueryClient()
  const { user, isAuthenticated, login: setAuthSession, logout: clearAuthSession } = useAuthStore()

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginInput) => {
      try {
        const response = await apiClient.post<ApiResponse<AuthSuccessPayload>>('/auth/login', payload)
        return unwrapResponse(response)
      } catch (error) {
        throw normalizeApiError(error)
      }
    },
    onSuccess: (data) => {
      setAuthSession({ user: data.user, accessToken: data.accessToken })
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, data.user)
    },
  })

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterInput) => {
      try {
        const response = await apiClient.post<ApiResponse<AuthUser>>('/auth/register', payload)
        return unwrapResponse(response)
      } catch (error) {
        throw normalizeApiError(error)
      }
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/logout')
        return unwrapResponse(response)
      } catch (error) {
        throw normalizeApiError(error)
      }
    },
    onSettled: () => {
      clearAuthSession()
      queryClient.removeQueries({ queryKey: AUTH_ME_QUERY_KEY })
    },
  })

  const googleAuth = async (): Promise<void> => {
    window.location.assign('http://localhost:5000/api/v1/auth/google')
  }

  const completeGoogleAuth = (payload: GoogleAuthResult) => {
    setAuthSession({ user: payload.user, accessToken: payload.accessToken })
    queryClient.setQueryData(AUTH_ME_QUERY_KEY, payload.user)
  }

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    googleAuth,
    completeGoogleAuth,
    isLoginPending: loginMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    isRegisterPending: registerMutation.isPending,
  }
}
