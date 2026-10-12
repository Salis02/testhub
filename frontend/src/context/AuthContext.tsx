import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '@/services/api'

interface User {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'creator'
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, pass: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('testhub_admin_token')
    if (token) {
      return {
        id: 'usr-admin-01',
        email: 'admin@testhub.com',
        fullName: 'Administrator TestHub',
        role: 'admin',
      }
    }
    return null
  })

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await api.adminLogin(email, pass)
      if (res && res.token) {
        setUser({
          id: res.user.id,
          email: res.user.email,
          fullName: res.user.fullName,
          role: res.user.role,
        })
        return true
      }
    } catch (err) {
      console.error('Login error:', err)
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem('testhub_admin_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
