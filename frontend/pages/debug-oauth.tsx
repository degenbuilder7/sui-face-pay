import React, { useState, useEffect } from 'react'
import { 
  getGoogleAuthUrl, 
  withNewZkLoginSession,
  relativeToCurrentEpoch 
} from '@shinami/nextjs-zklogin/client'
import { GOOGLE_CLIENT_ID } from '@/lib/shared/openid'
import { sui } from '@/lib/hooks/sui'

interface DebugOAuthProps {
  session?: any
}

function DebugOAuthComponent({ session }: DebugOAuthProps) {
  const [authUrl, setAuthUrl] = useState<string>('')
  const [redirectUri, setRedirectUri] = useState<string>('')
  const [locationInfo, setLocationInfo] = useState<any>({})

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get current location info
      const info = {
        origin: window.location.origin,
        href: window.location.href,
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol
      }
      setLocationInfo(info)

      // Generate the OAuth URL
      if (session && GOOGLE_CLIENT_ID) {
        try {
          const url = getGoogleAuthUrl(
            session,
            GOOGLE_CLIENT_ID,
            'auth/google',
            undefined
          )
          setAuthUrl(url.toString())

          // Extract redirect_uri from the URL
          const urlObj = new URL(url)
          const extractedRedirectUri = urlObj.searchParams.get('redirect_uri')
          setRedirectUri(extractedRedirectUri || '')
        } catch (error) {
          console.error('Error generating OAuth URL:', error)
        }
      }
    }
  }, [session])

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">OAuth Debug Information</h1>
        
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Location Info</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(locationInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Info</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Generated OAuth URL</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full OAuth URL:</label>
              <textarea 
                className="w-full p-3 border rounded text-sm font-mono"
                rows={4}
                value={authUrl}
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Extracted redirect_uri:</label>
              <input 
                className="w-full p-3 border rounded text-sm font-mono"
                value={redirectUri}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Google Cloud Console Configuration</h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              In your Google Cloud Console, make sure you have exactly this redirect URI:
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <code className="text-sm font-mono text-red-600">{redirectUri}</code>
            </div>
            <p className="text-xs text-gray-500">
              ⚠️ No trailing slash, exact port number, exact case
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Google Client ID:</span>
              <code className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
                {GOOGLE_CLIENT_ID || 'NOT SET'}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default withNewZkLoginSession(
  () => relativeToCurrentEpoch(sui),
  DebugOAuthComponent
) 