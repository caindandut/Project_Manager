import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ACCESS_TOKEN_KEY, useAuthStore } from '@/stores/authStore'
import type { ApiResponse } from '@/types/api'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

const API_BASE_URL = 'http://localhost:5000/api/v1'

const getStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

const createAuthHeaders = (
  headers: InternalAxiosRequestConfig['headers'],
  token: string,
): AxiosHeaders => {
  const nextHeaders = AxiosHeaders.from(headers)
  nextHeaders.set('Authorization', `Bearer ${token}`)
  return nextHeaders
}

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken()
  if (!token) {
    return config
  }

  return {
    ...config,
    headers: createAuthHeaders(config.headers, token),
  }
})

apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => response,
  async (error: AxiosError<ApiResponse<{ accessToken: string }>>) => {
    const originalRequest = error.config

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true

      try {
        const refreshResponse = await refreshClient.post<ApiResponse<{ accessToken: string }>>(
          '/auth/refresh',
        )

        const refreshedToken = refreshResponse.data.data?.accessToken
        if (!refreshedToken) {
          throw new Error('Refresh token response did not include access token')
        }

        useAuthStore.getState().setAccessToken(refreshedToken)
        originalRequest.headers = createAuthHeaders(originalRequest.headers, refreshedToken)

        return apiClient(originalRequest)
      } catch (refreshError) {
        useAuthStore.getState().logout()
        return Promise.reject(normalizeApiError(refreshError))
      }
    }

    return Promise.reject(normalizeApiError(error))
  },
)

export const unwrapResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  if (!response.data.success || response.data.data === undefined) {
    throw new Error(response.data.error?.message || 'Request failed')
  }

  return response.data.data
}

export const normalizeApiError = (error: unknown): Error => {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'Unexpected API error'

    return new Error(message)
  }

  if (error instanceof Error) {
    return error
  }

  return new Error('Unexpected API error')
}

export default apiClient
