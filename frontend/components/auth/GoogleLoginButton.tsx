'use client'

import React from 'react'
import { useRouter } from 'next/router'
import { 
  getGoogleAuthUrl, 
  withNewZkLoginSession,
  relativeToCurrentEpoch 
} from '@shinami/nextjs-zklogin/client'
import { GOOGLE_CLIENT_ID } from '@/lib/shared/openid'
import { sui } from '@/lib/hooks/sui'
import { Button } from '../ui/button'
import { useZkLogin } from '@/hooks/useZkLogin'

interface GoogleLoginButtonProps {
  redirectTo?: string
  className?: string
  disabled?: boolean
  session?: any // Added session prop for the HOC
}

function GoogleLoginButtonComponent({ session, redirectTo, className, disabled }: GoogleLoginButtonProps) {
  const { user: zkLoginUser, logout } = useZkLogin()
  const router = useRouter()
  
  // Debug logging
  console.log('🔍 GoogleLoginButton - zkLoginUser:', zkLoginUser)
  
  const handleGoogleLogin = async () => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('Google Client ID not configured')
      return
    }

    try {
      console.log('🚀 Starting Google OAuth flow...')
      console.log('📍 Current window.location.origin:', window.location.origin)
      console.log('🔑 Google Client ID:', GOOGLE_CLIENT_ID)
      
      const finalRedirectTo = redirectTo || (router.query.redirectTo as string)
      
      const authUrl = getGoogleAuthUrl(
        session,
        GOOGLE_CLIENT_ID,
        'auth/google', // This should match your callback route path
        finalRedirectTo
      )
      
      console.log('🌐 Generated OAuth URL:', authUrl)
      
      await router.replace(authUrl)
    } catch (error) {
      console.error('❌ Error initiating Google login:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('❌ Error logging out:', error)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-sm">
          Google OAuth not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable.
        </p>
      </div>
    )
  }

  // Show connected state if user is authenticated
  if (zkLoginUser && zkLoginUser.isAuthenticated) {
    return (
      <div className={`w-full space-y-4 ${className || ''}`}>
        {/* Connected Status Card */}
        <div className="w-full p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div className="text-sm text-green-700 dark:text-green-400 font-medium">
                zkLogin Connected via Google
              </div>
            </div>
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* User Information */}
        <div className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="space-y-3">
            {/* User Profile */}
            {(zkLoginUser.name || zkLoginUser.picture) && (
              <div className="flex items-center space-x-3">
                {zkLoginUser.picture && (
                  <img 
                    src={zkLoginUser.picture} 
                    alt={zkLoginUser.name || 'User'}
                    className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                  />
                )}
                <div>
                  {zkLoginUser.name && (
                    <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {zkLoginUser.name}
                    </div>
                  )}
                  {zkLoginUser.email && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {zkLoginUser.email}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Wallet Address */}
            {zkLoginUser.wallet && (
              <div className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">SUI Wallet Address</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                    {zkLoginUser.wallet.slice(0, 8)}...{zkLoginUser.wallet.slice(-8)}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(zkLoginUser.wallet!)}
                  className="ml-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  title="Copy wallet address"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center justify-center space-x-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Disconnect zkLogin</span>
        </Button>
      </div>
    )
  }

  // Show login button if not authenticated
  return (
    <Button
      onClick={handleGoogleLogin}
      variant="outline"
      className={`w-full flex items-center justify-center space-x-3 border-gray-300 hover:border-gray-400 transition-colors ${className || ''}`}
      disabled={disabled || !GOOGLE_CLIENT_ID}
    >
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      <span className="text-gray-700 font-medium">
        Continue with Google
      </span>
    </Button>
  )
}

// Export the component wrapped with the zkLogin session HOC
export default withNewZkLoginSession(
  () => relativeToCurrentEpoch(sui),
  GoogleLoginButtonComponent
) 