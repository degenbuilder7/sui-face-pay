import React from 'react'
import { useRouter } from 'next/router'
import { sui } from "@/lib/hooks/sui"
import {
  APPLE_CLIENT_ID,
  FACEBOOK_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  TWITCH_CLIENT_ID,
} from "@/lib/shared/openid"
import { first } from "@/lib/shared/utils"
import {
  getAppleAuthUrl,
  getFacebookAuthUrl,
  getGoogleAuthUrl,
  getTwitchAuthUrl,
  relativeToCurrentEpoch,
  withNewZkLoginSession,
} from "@shinami/nextjs-zklogin/client"
import { Button } from '@/components/ui/Button'

// This page should be installed at path "/auth/login".
// If you move it to a different path, remember to update env NEXT_PUBLIC_LOGIN_PAGE_PATH.
export default withNewZkLoginSession(
  () => relativeToCurrentEpoch(sui),
  ({ session }) => {
    const router = useRouter()
    const redirectTo = first(router.query.redirectTo)

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Welcome to SUI FacePay
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Connect your wallet to get started with face-based payments
            </p>
          </div>

          <div className="space-y-4">
            {GOOGLE_CLIENT_ID && (
              <Button
                onClick={() => {
                  void router.replace(
                    getGoogleAuthUrl(
                      session,
                      GOOGLE_CLIENT_ID!,
                      "google", // Update if moved to another path
                      redirectTo,
                    ),
                  );
                }}
                variant="outline"
                className="w-full flex items-center justify-center space-x-3 border-gray-300 hover:border-gray-400 transition-colors py-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                <span className="text-gray-700 font-medium">Continue with Google</span>
              </Button>
            )}

            {FACEBOOK_CLIENT_ID && (
              <Button
                onClick={() => {
                  void router.replace(
                    getFacebookAuthUrl(
                      session,
                      FACEBOOK_CLIENT_ID!,
                      "facebook", // Update if moved to another path
                      redirectTo,
                    ),
                  );
                }}
                variant="outline"
                className="w-full flex items-center justify-center space-x-3 border-blue-300 hover:border-blue-400 transition-colors py-3"
              >
                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-gray-700 font-medium">Continue with Facebook</span>
              </Button>
            )}

            {TWITCH_CLIENT_ID && (
              <Button
                onClick={() => {
                  void router.replace(
                    getTwitchAuthUrl(
                      session,
                      TWITCH_CLIENT_ID!,
                      "twitch", // Update if moved to another path
                      redirectTo,
                    ),
                  );
                }}
                variant="outline"
                className="w-full flex items-center justify-center space-x-3 border-purple-300 hover:border-purple-400 transition-colors py-3"
              >
                <svg className="w-5 h-5" fill="#9146FF" viewBox="0 0 24 24">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                </svg>
                <span className="text-gray-700 font-medium">Continue with Twitch</span>
              </Button>
            )}

            {APPLE_CLIENT_ID && (
              <Button
                onClick={() => {
                  void router.replace(
                    getAppleAuthUrl(
                      session,
                      APPLE_CLIENT_ID!,
                      "apple", // Update if moved to another path
                      redirectTo,
                    ),
                  );
                }}
                variant="outline"
                className="w-full flex items-center justify-center space-x-3 border-gray-300 hover:border-gray-400 transition-colors py-3"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C8.396 0 8.025.044 7.333.06 5.737.094 4.55.784 3.678 1.895c-.872 1.111-1.472 2.313-1.472 4.612 0 1.846.51 3.131 1.472 4.612.872 1.111 2.059 1.801 3.655 1.835.692.016 1.063.06 4.684.06s3.992-.044 4.684-.06c1.596-.034 2.783-.724 3.655-1.835.962-1.481 1.472-2.766 1.472-4.612 0-2.299-.6-3.501-1.472-4.612C19.483.784 18.296.094 16.7.06 16.008.044 15.637 0 12.017 0zm0 5.838A6.162 6.162 0 1 1 5.838 12 6.162 6.162 0 0 1 12.017 5.838zm0 10.162A3.838 3.838 0 1 0 8.179 12a3.838 3.838 0 0 0 3.838 3.838zM19.846 4.27a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"/>
                </svg>
                <span className="text-gray-700 font-medium">Continue with Apple</span>
              </Button>
            )}
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy.
              Your wallet will be created using zkLogin technology.
            </p>
          </div>
        </div>
      </div>
    )
  },
)
