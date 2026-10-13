// Core HTTP Client for TestHub Enterprise Architecture

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api'
export const AUTH_STORAGE_KEY = 'testhub_auth_token'
export const LEGACY_AUTH_STORAGE_KEY = 'testhub_admin_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(AUTH_STORAGE_KEY, token)
  localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken()
  const isFormData = options.body instanceof FormData

  const headers = new Headers(options.headers || {})
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${BASE_URL}${cleanEndpoint}`

  const res = await fetch(url, {
    ...options,
    headers,
  })

  // Handle 401 Unauthorized centrally
  if (res.status === 401) {
    clearStoredToken()
    if (!window.location.pathname.startsWith('/login')) {
      const current = window.location.pathname
      window.location.href = `/login?from=${encodeURIComponent(current)}&reason=expired`
    }
    throw new ApiError(401, 'Sesi Anda telah berakhir. Silakan login kembali.')
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    const message =
      (errorData && typeof errorData.error === 'string' && errorData.error) ||
      (errorData && typeof errorData.message === 'string' && errorData.message) ||
      `Permintaan gagal dengan status ${res.status}`
    throw new ApiError(res.status, message, errorData)
  }

  // Handle empty or 204 response
  if (res.status === 204) {
    return {} as T
  }

  return res.json()
}
