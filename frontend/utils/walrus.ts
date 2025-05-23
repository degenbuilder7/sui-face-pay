// Walrus storage utility for SUI FacePay
// Adapted from facebuddy-web-app

export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      id: string
      storedEpoch: number
      blobId: string
      size: number
      erasureCodeType: string
      certifiedEpoch: number
      storage: {
        id: string
        startEpoch: number
        endEpoch: number
        storageSize: number
      }
    }
  }
  alreadyCertified?: {
    blobId: string
    event: {
      txDigest: string
      eventSeq: number
    }
    endEpoch: number
  }
}

export interface WalrusBlob {
  blobId: string
  data: any
  size: number
  timestamp: number
}

const WALRUS_PUBLISHER_URL = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space'
const WALRUS_AGGREGATOR_URL = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space'

/**
 * Upload data to Walrus storage
 */
export async function uploadToWalrus(data: any): Promise<{ blobId: string; size: number } | null> {
  try {
    console.log('🐋 Uploading to Walrus...', { dataType: typeof data, dataSize: JSON.stringify(data).length })
    
    const jsonData = JSON.stringify(data)
    const blob = new Blob([jsonData], { type: 'application/json' })
    
    const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/store?epochs=5`, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Walrus upload failed:', response.status, errorText)
      throw new Error(`Upload failed: ${response.status} ${errorText}`)
    }

    const result: WalrusUploadResponse = await response.json()
    console.log('✅ Walrus upload response:', result)

    let blobId: string
    let size: number

    if (result.newlyCreated) {
      blobId = result.newlyCreated.blobObject.blobId
      size = result.newlyCreated.blobObject.size
    } else if (result.alreadyCertified) {
      blobId = result.alreadyCertified.blobId
      size = blob.size // Use the blob size we created
    } else {
      throw new Error('Unexpected response format from Walrus')
    }

    console.log(`✅ Successfully uploaded to Walrus: ${blobId} (${size} bytes)`)
    return { blobId, size }

  } catch (error) {
    console.error('❌ Error uploading to Walrus:', error)
    return null
  }
}

/**
 * Retrieve data from Walrus storage
 */
export async function retrieveFromWalrus(blobId: string): Promise<any | null> {
  try {
    console.log('🔍 Retrieving from Walrus:', blobId)
    
    const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/${blobId}`)
    
    if (!response.ok) {
      console.error('❌ Walrus retrieval failed:', response.status)
      throw new Error(`Retrieval failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Successfully retrieved from Walrus:', blobId)
    
    return data

  } catch (error) {
    console.error('❌ Error retrieving from Walrus:', error)
    return null
  }
}

/**
 * Check if a blob exists in Walrus
 */
export async function checkWalrusBlob(blobId: string): Promise<boolean> {
  try {
    const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/${blobId}`, {
      method: 'HEAD'
    })
    
    return response.ok
  } catch (error) {
    console.error('❌ Error checking Walrus blob:', error)
    return false
  }
}

/**
 * Upload facial descriptor data to Walrus
 */
export async function uploadFaceDataToWalrus(
  descriptor: Float32Array,
  profileData: any
): Promise<{ blobId: string; size: number } | null> {
  try {
    const faceData = {
      descriptor: Array.from(descriptor), // Convert Float32Array to regular array
      profile: profileData,
      timestamp: Date.now(),
      version: '1.0'
    }

    return await uploadToWalrus(faceData)
  } catch (error) {
    console.error('❌ Error uploading face data to Walrus:', error)
    return null
  }
}

/**
 * Retrieve facial descriptor data from Walrus
 */
export async function retrieveFaceDataFromWalrus(blobId: string): Promise<{
  descriptor: Float32Array
  profile: any
  timestamp: number
  version: string
} | null> {
  try {
    const data = await retrieveFromWalrus(blobId)
    if (!data) return null

    return {
      descriptor: new Float32Array(data.descriptor), // Convert back to Float32Array
      profile: data.profile,
      timestamp: data.timestamp,
      version: data.version
    }
  } catch (error) {
    console.error('❌ Error retrieving face data from Walrus:', error)
    return null
  }
}

/**
 * Generate a hash from facial descriptor for blockchain storage
 */
export function generateFaceHash(descriptor: Float32Array): string {
  // Convert Float32Array to a string representation
  const descriptorString = Array.from(descriptor).join(',')
  
  // Create a simple hash (in production, use crypto.subtle or similar)
  let hash = 0
  for (let i = 0; i < descriptorString.length; i++) {
    const char = descriptorString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16)
}

/**
 * Batch upload multiple face data objects
 */
export async function batchUploadFaceData(
  faceDataArray: Array<{ descriptor: Float32Array; profile: any }>
): Promise<Array<{ blobId: string; size: number } | null>> {
  const uploadPromises = faceDataArray.map(({ descriptor, profile }) =>
    uploadFaceDataToWalrus(descriptor, profile)
  )
  
  return Promise.all(uploadPromises)
} 