import React from 'react'
import Head from 'next/head'
import GoogleLoginButton from '@/components/auth/GoogleLoginButton'
import { useZkLogin } from '@/hooks/useZkLogin'

export default function TestGoogleLogin() {
  const { user, isLoading, error, logout } = useZkLogin()

  return (
    <>
      <Head>
        <title>Test Google Login - SUI FacePay</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Test Google zkLogin
            </h1>
            <p className="text-gray-600">
              Test the Google OAuth integration with zkLogin
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : user && user.isAuthenticated ? (
            <div className="text-center">
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">✅ Successfully Authenticated!</h3>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>Provider:</strong> {user.provider}</p>
                  {user.email && <p><strong>Email:</strong> {user.email}</p>}
                  {user.name && <p><strong>Name:</strong> {user.name}</p>}
                  {user.wallet && (
                    <p><strong>Wallet:</strong> {user.wallet.slice(0, 8)}...{user.wallet.slice(-8)}</p>
                  )}
                </div>
              </div>
              
              <button
                onClick={logout}
                className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <GoogleLoginButton />
              
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Click the button above to test Google OAuth with zkLogin
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-2">Debug Info:</h4>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Is Loading: {isLoading ? 'Yes' : 'No'}</p>
              <p>Has Error: {error ? 'Yes' : 'No'}</p>
              <p>Is Authenticated: {user?.isAuthenticated ? 'Yes' : 'No'}</p>
              <p>Environment: {process.env.NODE_ENV}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 