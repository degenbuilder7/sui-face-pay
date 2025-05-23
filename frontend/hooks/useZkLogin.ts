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

  // Check authentication status on mount and poll periodically
  useEffect(() => {
    checkAuthStatus()
    
    // Poll for auth status every 2 seconds to catch zkLogin completion
    const pollInterval = setInterval(() => {
      if (!user || !user.isAuthenticated) {
        checkAuthStatus()
      }
    }, 2000)
    
    // Cleanup polling on unmount or when user is authenticated
    return () => clearInterval(pollInterval)
  }, [user?.isAuthenticated])

  // Listen for route changes to re-check auth status
  useEffect(() => {
    const handleRouteChange = () => {
      // Re-check auth status when route changes (e.g., coming back from OAuth)
      setTimeout(() => checkAuthStatus(), 500)
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Use the Shinami /api/auth/me endpoint instead of /api/auth/user
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const userData = await response.json()
        console.log('✅ Auth status response:', userData)
        
        // Check if user is authenticated (zkLogin format)
        if (userData && (userData.wallet || userData.address)) {
          // Extract user info from JWT claims if available
          const jwtClaims = userData.jwtClaims || {}
          console.log('📋 JWT Claims:', jwtClaims)
          
          const zkLoginUser = {
            wallet: userData.wallet || userData.address,
            provider: userData.oidProvider || 'unknown',
            email: jwtClaims.email || userData.email,
            name: jwtClaims.name || userData.name,
            picture: jwtClaims.picture || userData.picture,
            isAuthenticated: true,
          }
          
          console.log('👤 Setting zkLogin user:', zkLoginUser)
          setUser(zkLoginUser)
        } else {
          console.log('❌ No wallet/address found in userData, setting user to null')
          setUser(null)
        }
      } else {
        console.log('Auth check failed:', response.status, response.statusText)
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
        // Redirect to home instead of login page
        router.push('/')
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