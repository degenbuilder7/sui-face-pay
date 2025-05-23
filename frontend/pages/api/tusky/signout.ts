import { NextApiRequest, NextApiResponse } from 'next'
import { cleanupTuskySession } from './init'

interface TuskySignoutRequest {
  sessionId: string
}

interface TuskySignoutResponse {
  success: boolean
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TuskySignoutResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { sessionId }: TuskySignoutRequest = req.body

    if (!sessionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: sessionId' 
      })
    }

    console.log(`🐋 Tusky API: Signing out session: ${sessionId}`)
    cleanupTuskySession(sessionId)

    console.log('🐋 Tusky API: Session cleaned up successfully')

    res.status(200).json({
      success: true
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Tusky signout failed:', error)
    
    res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
} 