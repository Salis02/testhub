// Core HTTP Client for TestHub Enterprise Architecture

export const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api'
export const AUTH_STORAGE_KEY = 'testhub_auth_token'
export const REFRESH_STORAGE_KEY = 'testhub_refresh_token'
export const LEGACY_AUTH_STORAGE_KEY = 'testhub_admin_token'
export const USER_EMAIL_KEY = 'testhub_user_email'

export function getStoredUserEmail(): string | null {
  return localStorage.getItem(USER_EMAIL_KEY)
}

export function setStoredUserEmail(email: string): void {
  if (email) {
    localStorage.setItem(USER_EMAIL_KEY, email.trim())
  }
}

export function clearStoredUserEmail(): void {
  localStorage.removeItem(USER_EMAIL_KEY)
}

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(AUTH_STORAGE_KEY, token)
  localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, token)
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_STORAGE_KEY)
}

export function setStoredRefreshToken(token: string): void {
  if (token) {
    localStorage.setItem(REFRESH_STORAGE_KEY, token)
  }
}

export function clearStoredRefreshToken(): void {
  localStorage.removeItem(REFRESH_STORAGE_KEY)
}

export function clearStoredToken(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
  clearStoredRefreshToken()
}

export class ApiError extends Error {
  public details?: unknown
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    this.details = data
  }
}

// Single-flight promise queue to prevent simultaneous multiple refresh requests
let refreshPromise: Promise<string | null> | null = null

async function requestTokenRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) {
      return null
    }

    try {
      const resp = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!resp.ok) {
        clearStoredToken()
        return null
      }

      const data = await resp.json()
      if (data && data.token) {
        setStoredToken(data.token)
        if (data.refresh_token) {
          setStoredRefreshToken(data.refresh_token)
        }
        return data.token as string
      }
      clearStoredToken()
      return null
    } catch {
      clearStoredToken()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken()
  const userEmail = getStoredUserEmail()
  const isFormData = options.body instanceof FormData

  const headers = new Headers(options.headers || {})
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (userEmail && !headers.has('X-User-Email')) {
    headers.set('X-User-Email', userEmail)
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${BASE_URL}${cleanEndpoint}`

  const res = await fetch(url, {
    ...options,
    headers,
  })

  // Handle 401 Unauthorized with Silent Auto-Refresh Interceptor
  if (res.status === 401) {
    const isAuthEndpoint =
      cleanEndpoint === '/auth/login' ||
      cleanEndpoint === '/auth/register' ||
      cleanEndpoint === '/auth/refresh'

    if (!isAuthEndpoint) {
      const newToken = await requestTokenRefresh()
      if (newToken) {
        // Retry the original request with the fresh access token
        const retryHeaders = new Headers(options.headers || {})
        if (!isFormData && !retryHeaders.has('Content-Type')) {
          retryHeaders.set('Content-Type', 'application/json')
        }
        retryHeaders.set('Authorization', `Bearer ${newToken}`)
        if (userEmail && !retryHeaders.has('X-User-Email')) {
          retryHeaders.set('X-User-Email', userEmail)
        }

        const retryRes = await fetch(url, {
          ...options,
          headers: retryHeaders,
        })

        if (retryRes.ok) {
          if (retryRes.status === 204) {
            return {} as T
          }
          return retryRes.json()
        }
      }
    }

    clearStoredToken()
    if (typeof window !== 'undefined') {
      const current = window.location.pathname
      const isProtectedRoute =
        current.startsWith('/admin') ||
        current.startsWith('/my-subscriptions') ||
        current.startsWith('/profile')

      if (isProtectedRoute && !current.startsWith('/login')) {
        window.location.href = `/login?from=${encodeURIComponent(current)}&reason=expired`
      }
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
