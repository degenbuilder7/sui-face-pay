import { NextApiRequest, NextApiResponse } from 'next'
import { getTuskyInstance } from './init'
import { SavedFace } from '../../../types'

interface TuskyUploadRequest {
  sessionId: string
  faceData: SavedFace
  vaultId: string
}

interface TuskyUploadResponse {
  success: boolean
  fileId?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TuskyUploadResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { sessionId, faceData, vaultId }: TuskyUploadRequest = req.body

    if (!sessionId || !faceData || !vaultId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: sessionId, faceData, vaultId' 
      })
    }

    const tusky = getTuskyInstance(sessionId)
    if (!tusky) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid session or Tusky not initialized' 
      })
    }

    console.log('🐋 Tusky API: Preparing face data for upload...')
    
    // Convert face data to JSON blob
    const jsonData = JSON.stringify(faceData)
    const blob = new Blob([jsonData], { type: 'application/json' })
    
    // Create a File object for upload
    const file = new File([blob], `face-${faceData.hash}.json`, { 
      type: 'application/json' 
    })

    console.log(`🐋 Tusky API: Uploading file to vault: ${vaultId}`)
    const fileId = await tusky.file.upload(vaultId, file)

    console.log(`🐋 Tusky API: Face data uploaded successfully: ${fileId}`)

    res.status(200).json({
      success: true,
      fileId
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Tusky upload failed:', error)
    
    res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
} 