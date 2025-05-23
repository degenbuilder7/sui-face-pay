import { NextApiRequest, NextApiResponse } from 'next'
import { getTuskyInstance } from './init'

interface TuskyDeleteRequest {
  sessionId: string
  fileId: string
}

interface TuskyDeleteResponse {
  success: boolean
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TuskyDeleteResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { sessionId, fileId }: TuskyDeleteRequest = req.body

    if (!sessionId || !fileId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: sessionId, fileId' 
      })
    }

    const tusky = getTuskyInstance(sessionId)
    if (!tusky) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid session or Tusky not initialized' 
      })
    }

    console.log(`🐋 Tusky API: Deleting file: ${fileId}`)
    await tusky.file.delete(fileId)

    console.log('🐋 Tusky API: Face data deleted successfully')

    res.status(200).json({
      success: true
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Tusky delete failed:', error)
    
    res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
} 