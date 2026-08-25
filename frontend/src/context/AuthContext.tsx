/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react'
import authService from '../services/auth.service'
import api from '../api/axios'
import { STORAGE_KEYS } from '../constants/storage'
import type { User } from '../types/user'

type AuthState = {
  user: User | null
  token: string | null
  loading: boolean
}

type LoginCredentials = { email: string; password: string }

type AuthContextType = AuthState & {
  login: (creds: LoginCredentials) => Promise<User>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.user)
    if (!storedUser) return null
    try {
      return JSON.parse(storedUser)
    } catch {
      return null
    }
  })

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.token)
  })

  const [loading, setLoading] = useState<boolean>(false)

  // no effect needed: state restored synchronously from localStorage

  const login = async (creds: LoginCredentials) => {
    setLoading(true)
    try {
      const resp = await authService.login(creds)
      localStorage.setItem(STORAGE_KEYS.token, resp.token)
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(resp.user))
      setToken(resp.token)
      setUser(resp.user)
      return resp.user
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.token)
    localStorage.removeItem(STORAGE_KEYS.user)
    setToken(null)
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const res = await api.get<User>('/users/me')
      setUser(res.data)
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(res.data))
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
