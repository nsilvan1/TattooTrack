import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import api from '../services/api'

interface User {
  id: string
  username: string
  name: string
  picture?: string
  calendarConnected: boolean
}

interface LoginData {
  username: string
  password: string
}

interface RegisterData {
  name: string
  username: string
  password: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginData) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')

    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      const { data } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(data)
    } catch (error) {
      localStorage.removeItem('token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (loginData: LoginData) => {
    const { data } = await api.post('/auth/login', loginData)
    localStorage.setItem('token', data.token)
    setUser(data.user)
  }

  const register = async (registerData: RegisterData) => {
    const { data } = await api.post('/auth/register', registerData)
    localStorage.setItem('token', data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    window.location.href = '/login'
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
