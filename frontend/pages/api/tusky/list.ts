import { NextApiRequest, NextApiResponse } from 'next'
import { getTuskyInstance } from './init'
import { SavedFace } from '../../../types'

interface TuskyListRequest {
  sessionId: string
  vaultId: string
}

interface TuskyListResponse {
  success: boolean
  faceData?: SavedFace[]
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TuskyListResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { sessionId, vaultId }: TuskyListRequest = req.body

    if (!sessionId || !vaultId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: sessionId, vaultId' 
      })
    }

    const tusky = getTuskyInstance(sessionId)
    if (!tusky) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid session or Tusky not initialized' 
      })
    }

    console.log('🐋 Tusky API: Listing files in vault...')
    const files = await tusky.file.listAll()

    // Filter for face data files in our vault
    const faceFiles = files.filter((file: any) => 
      file.vaultId === vaultId &&
      file.name?.startsWith('face-') && 
      file.name?.endsWith('.json')
    )

    console.log(`🐋 Tusky API: Found ${faceFiles.length} face files`)

    // Download face data for each file
    const faceDataPromises = faceFiles.map(async (file: any) => {
      try {
        console.log(`🐋 Tusky API: Downloading file: ${file.id}`)
        const fileBuffer = await tusky.file.download(file.id)
        
        // Convert buffer to string
        let jsonString: string
        if (typeof fileBuffer === 'string') {
          jsonString = fileBuffer
        } else if (fileBuffer && typeof fileBuffer === 'object' && 'byteLength' in fileBuffer) {
          jsonString = new TextDecoder().decode(fileBuffer as ArrayBuffer)
        } else {
          throw new Error('Unexpected file buffer type')
        }
        
        const faceData = JSON.parse(jsonString) as SavedFace
        console.log(`🐋 Tusky API: Face data downloaded: ${faceData.hash}`)
        return faceData
      } catch (error) {
        console.error(`❌ Failed to download file ${file.id}:`, error)
        return null
      }
    })

    const results = await Promise.allSettled(faceDataPromises)
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<SavedFace> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)

    console.log(`🐋 Tusky API: Retrieved ${successfulResults.length} face records`)

    res.status(200).json({
      success: true,
      faceData: successfulResults
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Tusky list failed:', error)
    
    res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
} 