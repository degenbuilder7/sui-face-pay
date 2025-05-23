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
import { Button } from '../ui/Button'

interface GoogleLoginButtonProps {
  redirectTo?: string
  className?: string
  disabled?: boolean
  session?: any // Added session prop for the HOC
}

function GoogleLoginButtonComponent({ session, redirectTo, className, disabled }: GoogleLoginButtonProps) {
  const router = useRouter()
  
  const handleGoogleLogin = async () => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('Google Client ID not configured')
      return
    }

    try {
      const finalRedirectTo = redirectTo || (router.query.redirectTo as string)
      const authUrl = getGoogleAuthUrl(
        session,
        GOOGLE_CLIENT_ID,
        'google', // This should match your callback route path
        finalRedirectTo
      )
      
      console.log('Redirecting to Google OAuth:', authUrl)
      await router.replace(authUrl)
    } catch (error) {
      console.error('Error initiating Google login:', error)
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