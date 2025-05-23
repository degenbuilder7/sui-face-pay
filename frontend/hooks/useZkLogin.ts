'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export interface ZkLoginUser {
  wallet: string
  provider: string
  email?: string
  name?: string
  picture?: string
  isAuthenticated: boolean
}

export interface ZkLoginState {
  user: ZkLoginUser | null
  isLoading: boolean
  error: string | null
  login: (provider: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export function useZkLogin(): ZkLoginState {
  const [user, setUser] = useState<ZkLoginUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const userData = await response.json()
        if (userData.isAuthenticated) {
          setUser({
            wallet: userData.wallet,
            provider: userData.provider,
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            isAuthenticated: true,
          })
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error('Error checking auth status:', err)
      setError('Failed to check authentication status')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (provider: string) => {
    try {
      setIsLoading(true)
      setError(null)

      // Redirect to the appropriate login page
      const redirectTo = router.asPath !== '/auth/login' ? router.asPath : '/'
      router.push(`/auth/login?provider=${provider}&redirectTo=${encodeURIComponent(redirectTo)}`)
    } catch (err) {
      console.error('Error initiating login:', err)
      setError('Failed to initiate login')
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        setUser(null)
        router.push('/auth/login')
      } else {
        throw new Error('Logout failed')
      }
    } catch (err) {
      console.error('Error logging out:', err)
      setError('Failed to logout')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async () => {
    await checkAuthStatus()
  }

  return {
    user,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
  }
} 