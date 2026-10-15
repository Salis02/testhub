import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { User } from '@/types'
import {
  setStoredUserEmail,
  clearStoredUserEmail,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from '@/services/client'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isCheckingAuth: boolean
  login: (email: string, pass: string) => Promise<boolean>
  register: (email: string, pass: string, fullName: string, role?: string) => Promise<boolean>
  logout: () => void
  verifySession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,
  login: async () => false,
  register: async () => false,
  logout: () => {},
  verifySession: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true)

  const verifySession = useCallback(async () => {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      setIsCheckingAuth(false)
      return
    }

    try {
      const verifiedUser = await api.getCurrentUser()
      if (verifiedUser) {
        setUser(verifiedUser)
        setStoredUserEmail(verifiedUser.email)
      } else {
        clearStoredToken()
        clearStoredUserEmail()
        setUser(null)
      }
    } catch (err) {
      console.warn('Session verification error:', err)
      clearStoredToken()
      clearStoredUserEmail()
      setUser(null)
    } finally {
      setIsCheckingAuth(false)
    }
  }, [])

  useEffect(() => {
    verifySession()
  }, [verifySession])

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await api.adminLogin(email, pass)
      if (res && res.token && res.user) {
        setUser(res.user)
        setStoredToken(res.token)
        setStoredUserEmail(res.user.email)
        return true
      }
    } catch (err) {
      console.error('Login error:', err)
      throw err
    }
    return false
  }

  const register = async (email: string, pass: string, fullName: string, role?: string): Promise<boolean> => {
    try {
      const res = await api.adminRegister(email, pass, fullName, role || 'creator')
      if (res && res.token && res.user) {
        setUser(res.user)
        setStoredToken(res.token)
        setStoredUserEmail(res.user.email)
        return true
      }
    } catch (err) {
      console.error('Register error:', err)
      throw err
    }
    return false
  }

  const logout = () => {
    clearStoredToken()
    clearStoredUserEmail()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isCheckingAuth,
        login,
        register,
        logout,
        verifySession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
