import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

interface SendOtpInput {
  email: string
}

interface VerifyOtpInput {
  email: string
  code: string
}

interface RegisterWithOtpInput {
  email: string
  name: string
  password: string
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
  const {
    user,
    isAuthenticated,
    accessToken,
    hasHydratedAuth,
    requireOnboarding,
    login: setAuthSession,
    logout: clearAuthSession,
    setUser,
    setHydratedAuth,
  } = useAuthStore()

  const meQuery = useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await apiClient.get<ApiResponse<AuthUser>>('/auth/me')
        return unwrapResponse(response)
      } catch (error) {
        throw normalizeApiError(error)
      }
    },
    enabled: Boolean(accessToken) && !user,
    retry: false,
  })

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data)
      setHydratedAuth(true)
    }
  }, [meQuery.data, setHydratedAuth, setUser])

  useEffect(() => {
    if (meQuery.isError) {
      clearAuthSession()
    }
  }, [clearAuthSession, meQuery.isError])

  useEffect(() => {
    if (!accessToken && !hasHydratedAuth) {
      setHydratedAuth(true)
    }
  }, [accessToken, hasHydratedAuth, setHydratedAuth])

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

  const sendOtpMutation = useMutation({
    mutationFn: async (payload: SendOtpInput) => {
      try {
        const response = await apiClient.post<ApiResponse<{ message: string; expiresIn: number }>>('/auth/send-otp', payload)
        return unwrapResponse(response)
      } catch (error) {
        throw normalizeApiError(error)
      }
    },
  })

  const verifyOtpMutation = useMutation({
    mutationFn: async (payload: VerifyOtpInput) => {
      try {
        const response = await apiClient.post<ApiResponse<{ message: string; email: string }>>('/auth/verify-otp', payload)
        return unwrapResponse(response)
      } catch (error) {
        throw normalizeApiError(error)
      }
    },
  })

  const registerWithOtpMutation = useMutation({
    mutationFn: async (payload: RegisterWithOtpInput) => {
      try {
        const response = await apiClient.post<ApiResponse<AuthUser>>('/auth/register-with-otp', payload)
        return unwrapResponse(response)
      } catch (error) {
        throw normalizeApiError(error)
      }
    },
  })

  return {
    user,
    isAuthenticated,
    authBootstrapError: meQuery.error ?? null,
    isBootstrappingAuth: Boolean(accessToken) && !user && (meQuery.isPending || !hasHydratedAuth),
    requireOnboarding,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    googleAuth,
    completeGoogleAuth,
    isLoginPending: loginMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    isRegisterPending: registerMutation.isPending,
    sendOtp: sendOtpMutation.mutateAsync,
    verifyOtp: verifyOtpMutation.mutateAsync,
    registerWithOtp: registerWithOtpMutation.mutateAsync,
    isSendOtpPending: sendOtpMutation.isPending,
    isVerifyOtpPending: verifyOtpMutation.isPending,
    isRegisterWithOtpPending: registerWithOtpMutation.isPending,
  }
}
