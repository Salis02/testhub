import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { User } from '@/types'
import { setStoredUserEmail, clearStoredUserEmail } from '@/services/client'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isCheckingAuth: boolean
  login: (email: string, pass: string) => Promise<boolean>
  logout: () => void
  verifySession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,
  login: async () => false,
  logout: () => {},
  verifySession: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true)

  const verifySession = useCallback(async () => {
    const token = localStorage.getItem('testhub_admin_token')
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
        localStorage.removeItem('testhub_admin_token')
        clearStoredUserEmail()
        setUser(null)
      }
    } catch (err) {
      console.warn('Session verification error:', err)
      localStorage.removeItem('testhub_admin_token')
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
        setStoredUserEmail(res.user.email)
        return true
      }
    } catch (err) {
      console.error('Login error:', err)
      throw err
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem('testhub_admin_token')
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
        logout,
        verifySession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
