import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../stores/auth'

const rawBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
/** Base URL of the Django API without a trailing slash. */
export const API_BASE = rawBase.replace(/\/+$/, '')

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 30_000,
})

api.interceptors.request.use((config) => {
  const { access } = useAuthStore.getState()
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const { refresh, setTokens, logout } = useAuthStore.getState()
  if (!refresh) return null
  try {
    const { data } = await axios.post<{ access: string; refresh?: string }>(
      `${API_BASE}/api/v1/auth/token/refresh/`,
      { refresh },
    )
    setTokens(data.access, data.refresh ?? refresh)
    return data.access
  } catch {
    logout()
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean }
    const isAuthRoute = original?.url?.includes('/auth/')
    if (error.response?.status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const access = await refreshPromise
      if (access) {
        original.headers.Authorization = `Bearer ${access}`
        return api(original)
      }
    }
    return Promise.reject(error)
  },
)

/** Fetch a paginated page either by absolute `next` URL or a relative path. */
export async function fetchPage<T>(url: string): Promise<T> {
  const { data } = await api.get<T>(url)
  return data
}

function firstMessage(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item)
      if (message) return message
    }
    return null
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const message = firstMessage(nested)
      if (message) return message
    }
  }
  return null
}

const FIELD_LABELS: Record<string, string> = {
  username: 'Username',
  email: 'Email',
  password: 'Password',
  new_password: 'New password',
  current_password: 'Current password',
  content: 'Content',
  image: 'Image',
  avatar: 'Avatar',
  cover: 'Cover',
  website: 'Website',
}

/** Extract a human-readable message from a DRF error response (or a network error). */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!axios.isAxiosError(error)) return fallback
  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? 'The request timed out. Please try again.'
      : 'Cannot reach the server. Check your connection.'
  }
  const { status, data } = error.response
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.'
  if (status === 413) return 'That file is too large.'
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (typeof record.detail === 'string') return record.detail
    for (const [key, value] of Object.entries(record)) {
      const message = firstMessage(value)
      if (!message) continue
      if (key === 'non_field_errors') return message
      const label = FIELD_LABELS[key]
      return label && !message.toLowerCase().includes(label.toLowerCase())
        ? `${label}: ${message}`
        : message
    }
  }
  if (status >= 500) return 'The server had a problem. Please try again shortly.'
  return fallback
}

/** Field-level errors from a DRF 400 response, keyed by field name. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!axios.isAxiosError(error) || error.response?.status !== 400) return errors
  const data = error.response.data
  if (!data || typeof data !== 'object') return errors
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const message = firstMessage(value)
    if (message) errors[key] = message
  }
  return errors
}
