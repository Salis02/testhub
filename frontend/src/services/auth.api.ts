import {
  apiClient,
  setStoredToken,
  setStoredRefreshToken,
  getStoredRefreshToken,
  clearStoredToken,
} from './client'
import { AuthResponse, User } from '@/types'

export const authApi = {
  async login(
    emailOrCreds: string | { email: string; password: string },
    passwordArg?: string
  ): Promise<AuthResponse> {
    const payload =
      typeof emailOrCreds === 'string'
        ? { email: emailOrCreds, password: passwordArg || '' }
        : emailOrCreds

    const data = await apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const user: User = {
      id: data.user_id,
      email: data.email,
      fullName: data.full_name,
      role: data.role,
    }

    if (data.token) {
      setStoredToken(data.token)
    }
    if (data.refresh_token) {
      setStoredRefreshToken(data.refresh_token)
    }

    return {
      ...data,
      user,
    }
  },

  async register(
    emailOrPayload: string | { email: string; password: string; full_name: string; role?: string },
    passwordArg?: string,
    fullNameArg?: string,
    roleArg?: string
  ): Promise<AuthResponse> {
    const payload =
      typeof emailOrPayload === 'string'
        ? {
            email: emailOrPayload,
            password: passwordArg || '',
            full_name: fullNameArg || '',
            role: roleArg || 'creator',
          }
        : emailOrPayload

    const data = await apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const user: User = {
      id: data.user_id,
      email: data.email,
      fullName: data.full_name,
      role: data.role,
    }

    if (data.token) {
      setStoredToken(data.token)
    }
    if (data.refresh_token) {
      setStoredRefreshToken(data.refresh_token)
    }

    return {
      ...data,
      user,
    }
  },

  async googleLogin(credential: string, role?: string): Promise<AuthResponse> {
    const data = await apiClient<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential, role: role || 'user' }),
    })

    const user: User = {
      id: data.user_id,
      email: data.email,
      fullName: data.full_name,
      role: data.role,
    }

    if (data.token) {
      setStoredToken(data.token)
    }
    if (data.refresh_token) {
      setStoredRefreshToken(data.refresh_token)
    }

    return {
      ...data,
      user,
    }
  },

  async me(signal?: AbortSignal): Promise<User> {
    const res = await apiClient<{
      id?: string
      user_id?: string
      email: string
      full_name: string
      role: 'admin' | 'creator' | 'user'
    }>('/auth/me', { signal })

    return {
      id: res.id || res.user_id || '',
      email: res.email,
      fullName: res.full_name,
      role: res.role,
    }
  },

  async refreshToken(): Promise<AuthResponse | null> {
    const token = getStoredRefreshToken()
    if (!token) return null

    try {
      const data = await apiClient<AuthResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: token }),
      })

      if (data.token) {
        setStoredToken(data.token)
      }
      if (data.refresh_token) {
        setStoredRefreshToken(data.refresh_token)
      }
      return data
    } catch {
      clearStoredToken()
      return null
    }
  },

  async logout(): Promise<void> {
    const refreshToken = getStoredRefreshToken()
    try {
      await apiClient('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken || '' }),
      })
    } catch {
      // Ignore network errors during logout
    } finally {
      clearStoredToken()
    }
  },
}
