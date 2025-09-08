'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/lib/config'

interface User {
  id: string
  email: string
  name: string
  role: string
  planType: string
  messagesUsed: number
  messagesLimit: number
  planExpiry?: string
  createdAt: string
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })
  const router = useRouter()

  // Verificar token y obtener usuario
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setAuthState({ user: null, loading: false, error: null })
        return false
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Token inválido')
      }

      const data = await response.json()

      if (data.success) {
        setAuthState({ 
          user: data.user, 
          loading: false, 
          error: null 
        })
        // Actualizar localStorage con datos frescos
        localStorage.setItem('user', JSON.stringify(data.user))
        return true
      } else {
        throw new Error(data.error || 'Error de autenticación')
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error)
      // Limpiar datos inválidos
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setAuthState({ 
        user: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Error de autenticación' 
      })
      return false
    }
  }, [])

  // Login
  const login = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        setAuthState({ 
          user: data.user, 
          loading: false, 
          error: null 
        })
        
        return { success: true }
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: data.error || 'Error al iniciar sesión' 
        }))
        return { success: false, error: data.error }
      }
    } catch (error) {
      const errorMsg = 'Error de conexión. Por favor intente nuevamente.'
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMsg 
      }))
      return { success: false, error: errorMsg }
    }
  }

  // Register
  const register = async (name: string, email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        setAuthState({ 
          user: data.user, 
          loading: false, 
          error: null 
        })
        
        return { success: true }
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: data.error || 'Error al registrar usuario' 
        }))
        return { success: false, error: data.error }
      }
    } catch (error) {
      const errorMsg = 'Error de conexión. Por favor intente nuevamente.'
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMsg 
      }))
      return { success: false, error: errorMsg }
    }
  }

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setAuthState({ user: null, loading: false, error: null })
    router.push('/login')
  }, [router])

  // Verificar autenticación al montar el componente
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Renovar token automáticamente cada 5 minutos
  useEffect(() => {
    if (authState.user) {
      const interval = setInterval(() => {
        checkAuth()
      }, 5 * 60 * 1000) // 5 minutos

      return () => clearInterval(interval)
    }
  }, [authState.user, checkAuth])

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    login,
    register,
    logout,
    checkAuth
  }
}