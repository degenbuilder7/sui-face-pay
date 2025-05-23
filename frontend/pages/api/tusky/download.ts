import { NextApiRequest, NextApiResponse } from 'next'
import { getTuskyInstance } from './init'
import { SavedFace } from '../../../types'

interface TuskyDownloadRequest {
  sessionId: string
  fileId: string
}

interface TuskyDownloadResponse {
  success: boolean
  faceData?: SavedFace
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TuskyDownloadResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { sessionId, fileId }: TuskyDownloadRequest = req.body

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

    console.log(`🐋 Tusky API: Downloading file: ${fileId}`)
    const fileBuffer = await tusky.file.download(fileId)

    // Convert buffer to string - handle different return types
    let jsonString: string
    if (typeof fileBuffer === 'string') {
      jsonString = fileBuffer
    } else if (fileBuffer && typeof fileBuffer === 'object' && 'byteLength' in fileBuffer) {
      // This is likely an ArrayBuffer or similar buffer type
      jsonString = new TextDecoder().decode(fileBuffer as ArrayBuffer)
    } else {
      throw new Error('Unexpected file buffer type')
    }
    
    const faceData = JSON.parse(jsonString) as SavedFace

    console.log(`🐋 Tusky API: Face data downloaded successfully: ${faceData.hash}`)

    res.status(200).json({
      success: true,
      faceData
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Tusky download failed:', error)
    
    res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
} 