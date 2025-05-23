import { NextApiRequest, NextApiResponse } from 'next'

interface UserResponse {
  isAuthenticated: boolean
  wallet: string | null
  provider: string | null
}

// Simple API route to check authentication status
export default function handler(req: NextApiRequest, res: NextApiResponse<UserResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      isAuthenticated: false,
      wallet: null,
      provider: null,
    })
  }

  // Check if there's a session cookie or token
  // This is a simple check - in a real app you'd validate the session
  const hasSession = req.cookies['zklogin-session'] || req.cookies['iron-session/zklogin']
  
  if (hasSession) {
    // In a real implementation, you'd decode the session to get user info
    // For now, just return that they're authenticated
    return res.status(200).json({
      isAuthenticated: true,
      wallet: null, // Would be extracted from session
      provider: null, // Would be extracted from session
    })
  }

  return res.status(200).json({
    isAuthenticated: false,
    wallet: null,
    provider: null,
  })
} 