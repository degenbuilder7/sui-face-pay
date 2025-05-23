import { Tusky } from "@tusky-io/ts-sdk";
import { 
  TuskyConfig, 
  TuskyVault, 
  TuskyFile, 
  TuskyUploadOptions, 
  TuskyUploadProgress,
  SavedFace,
  ProfileData,
  FaceDescriptor
} from '../types'

// =============================================================================
// BROWSER-COMPATIBLE TUSKY CLIENT
// =============================================================================

interface TuskyResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

class BrowserTuskyClient {
  private apiKey: string
  private baseUrl: string = 'https://api.tusky.io'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<TuskyResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error('Tusky API request failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async createVault(name: string, options: { encrypted?: boolean; description?: string } = {}): Promise<TuskyVault | null> {
    const response = await this.request<TuskyVault>('/vaults', {
      method: 'POST',
      body: JSON.stringify({
        name,
        encrypted: options.encrypted !== false,
        description: options.description || '',
      }),
    })

    return response.success ? response.data! : null
  }

  async listVaults(): Promise<TuskyVault[]> {
    const response = await this.request<{ items: TuskyVault[] }>('/vaults')
    return response.success ? response.data!.items : []
  }

  async uploadFile(vaultId: string, file: Blob, options: Partial<TuskyUploadOptions> = {}): Promise<string | null> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('vaultId', vaultId)
      
      if (options.name) formData.append('name', options.name)
      if (options.mimeType) formData.append('mimeType', options.mimeType)

      const response = await fetch(`${this.baseUrl}/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.fileId || result.id
    } catch (error) {
      console.error('File upload failed:', error)
      return null
    }
  }

  async downloadFile(fileId: string): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }

      return await response.arrayBuffer()
    } catch (error) {
      console.error('File download failed:', error)
      return null
    }
  }

  async getFile(fileId: string): Promise<TuskyFile | null> {
    const response = await this.request<TuskyFile>(`/files/${fileId}`)
    return response.success ? response.data! : null
  }

  async listFiles(vaultId: string): Promise<TuskyFile[]> {
    const response = await this.request<{ items: TuskyFile[] }>(`/files?vaultId=${vaultId}`)
    return response.success ? response.data!.items : []
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const response = await this.request(`/files/${fileId}`, { method: 'DELETE' })
    return response.success
  }
}

// =============================================================================
// CLIENT MANAGEMENT
// =============================================================================

let tuskyClient: BrowserTuskyClient | null = null

/**
 * Initialize Tusky client with API key
 */
export const initializeTusky = async (config?: TuskyConfig): Promise<BrowserTuskyClient> => {
  if (tuskyClient && !config) {
    return tuskyClient
  }

  const apiKey = process.env.NEXT_PUBLIC_TUSKY_API_KEY
  if (!apiKey) {
    throw new Error('Tusky API key is required. Set NEXT_PUBLIC_TUSKY_API_KEY environment variable.')
  }

  tuskyClient = new BrowserTuskyClient(apiKey)
  return tuskyClient
}

/**
 * Get or create Tusky client instance
 */
export const getTuskyClient = async (): Promise<BrowserTuskyClient> => {
  if (!tuskyClient) {
    return await initializeTusky()
  }
  return tuskyClient
}

// =============================================================================
// VAULT MANAGEMENT
// =============================================================================

/**
 * Create or get the FacePay vault for storing face data
 */
export const getFacePayVault = async (): Promise<TuskyVault> => {
  const tusky = await getTuskyClient()
  
  try {
    // Try to find existing FacePay vault
    const vaults = await tusky.listVaults()
    const existingVault = vaults.find(vault => vault.name === 'FacePay-Faces')
    
    if (existingVault) {
      return existingVault
    }
    
    // Create new vault if not found
    const vault = await tusky.createVault('FacePay-Faces', {
      description: 'SUI FacePay facial recognition data storage',
      encrypted: true,
    })
    
    if (!vault) {
      throw new Error('Failed to create vault')
    }
    
    return vault
  } catch (error) {
    console.error('Error managing FacePay vault:', error)
    throw new Error(`Failed to create/access FacePay vault: ${error}`)
  }
}

// =============================================================================
// FACE DATA STORAGE
// =============================================================================

/**
 * Generate a secure hash from face descriptor
 */
export const generateFaceHash = (descriptor: Float32Array): string => {
  // Convert Float32Array to string for hashing
  const descriptorString = Array.from(descriptor).join(',')
  
  // Create a simple hash (in production, use crypto.subtle.digest)
  let hash = 0
  for (let i = 0; i < descriptorString.length; i++) {
    const char = descriptorString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

/**
 * Prepare face data for storage
 */
export const prepareFaceData = (
  faceDescriptor: FaceDescriptor,
  profileData: ProfileData
): SavedFace => {
  const id = crypto.randomUUID()
  const hash = generateFaceHash(faceDescriptor.descriptor)
  
  return {
    id,
    hash,
    descriptor: Array.from(faceDescriptor.descriptor),
    landmarks: faceDescriptor.landmarks!,
    detection: faceDescriptor.detection!,
    profileData,
    tuskyFileId: '', // Will be set after upload
    tuskyVaultId: '', // Will be set after upload
    blobId: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Upload face data to Tusky storage
 */
export const uploadFaceDataToTusky = async (
  faceData: SavedFace,
  onProgress?: (progress: TuskyUploadProgress) => void
): Promise<SavedFace> => {
  const tusky = await getTuskyClient()
  
  try {
    // Get or create FacePay vault
    const vault = await getFacePayVault()
    
    // Convert face data to JSON blob
    const jsonData = JSON.stringify(faceData)
    const blob = new Blob([jsonData], { type: 'application/json' })
    
    // Upload file
    const fileId = await tusky.uploadFile(vault.id, blob, {
      name: `face-${faceData.hash}.json`,
      mimeType: 'application/json',
    })
    
    if (!fileId) {
      throw new Error('Upload returned no file ID')
    }
    
    // Get file details
    const fileDetails = await tusky.getFile(fileId)
    
    // Update face data with Tusky information
    const updatedFaceData: SavedFace = {
      ...faceData,
      tuskyFileId: fileId,
      tuskyVaultId: vault.id,
      blobId: fileDetails?.blobId,
      updatedAt: new Date().toISOString(),
    }
    
    console.log('Face data uploaded to Tusky:', {
      fileId,
      vaultId: vault.id,
      blobId: fileDetails?.blobId,
      hash: faceData.hash
    })
    
    // Call progress callback if provided
    onProgress?.({
      bytesUploaded: blob.size,
      bytesTotal: blob.size,
      percentage: 100
    })
    
    return updatedFaceData
  } catch (error) {
    console.error('Error uploading face data to Tusky:', error)
    throw new Error(`Failed to upload face data: ${error}`)
  }
}

/**
 * Retrieve face data from Tusky storage
 */
export const retrieveFaceDataFromTusky = async (fileId: string): Promise<SavedFace> => {
  const tusky = await getTuskyClient()
  
  try {
    // Get file data as ArrayBuffer
    const fileBuffer = await tusky.downloadFile(fileId)
    
    if (!fileBuffer) {
      throw new Error('No data received')
    }
    
    // Convert ArrayBuffer to string
    const jsonString = new TextDecoder().decode(fileBuffer)
    
    // Parse JSON data
    const faceData = JSON.parse(jsonString) as SavedFace
    
    console.log('Face data retrieved from Tusky:', {
      fileId,
      hash: faceData.hash,
      blobId: faceData.blobId
    })
    
    return faceData
  } catch (error) {
    console.error('Error retrieving face data from Tusky:', error)
    throw new Error(`Failed to retrieve face data: ${error}`)
  }
}

/**
 * List all face files in the FacePay vault
 */
export const listFaceData = async (): Promise<SavedFace[]> => {
  const tusky = await getTuskyClient()
  
  try {
    // Get FacePay vault
    const vault = await getFacePayVault()
    
    // List all files in the vault
    const files = await tusky.listFiles(vault.id)
    
    // Filter for face data files
    const faceFiles = files.filter(file => 
      file.name?.startsWith('face-') && 
      file.name?.endsWith('.json') &&
      file.mimeType === 'application/json'
    )
    
    // Retrieve face data for each file
    const faceDataPromises = faceFiles.map(file => 
      retrieveFaceDataFromTusky(file.id)
    )
    
    const faceDataArray = await Promise.allSettled(faceDataPromises)
    const successfulResults = faceDataArray
      .filter((result): result is PromiseFulfilledResult<SavedFace> => result.status === 'fulfilled')
      .map(result => result.value)
    
    console.log(`Retrieved ${successfulResults.length} face records from Tusky`)
    
    return successfulResults
  } catch (error) {
    console.error('Error listing face data from Tusky:', error)
    throw new Error(`Failed to list face data: ${error}`)
  }
}

/**
 * Delete face data from Tusky storage
 */
export const deleteFaceDataFromTusky = async (fileId: string): Promise<void> => {
  const tusky = await getTuskyClient()
  
  try {
    const success = await tusky.deleteFile(fileId)
    if (!success) {
      throw new Error('Delete operation failed')
    }
    console.log('Face data deleted from Tusky:', fileId)
  } catch (error) {
    console.error('Error deleting face data from Tusky:', error)
    throw new Error(`Failed to delete face data: ${error}`)
  }
}

// =============================================================================
// SEARCH AND MATCHING
// =============================================================================

/**
 * Find face data by hash
 */
export const findFaceByHash = async (hash: string): Promise<SavedFace | null> => {
  try {
    const allFaces = await listFaceData()
    return allFaces.find(face => face.hash === hash) || null
  } catch (error) {
    console.error('Error finding face by hash:', error)
    return null
  }
}

/**
 * Find face data by SUI address
 */
export const findFacesBySuiAddress = async (suiAddress: string): Promise<SavedFace[]> => {
  try {
    const allFaces = await listFaceData()
    return allFaces.filter(face => face.profileData.suiAddress === suiAddress)
  } catch (error) {
    console.error('Error finding faces by SUI address:', error)
    return []
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if Tusky is properly configured
 */
export const isTuskyConfigured = (): boolean => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TUSKY_API_KEY
    return !!apiKey
  } catch {
    return false
  }
}

/**
 * Get Tusky storage info
 */
export const getTuskyStorageInfo = async () => {
  try {
    const tusky = await getTuskyClient()
    
    const vaults = await tusky.listVaults()
    const facePayVault = vaults.find(v => v.name === 'FacePay-Faces')
    
    let faceCount = 0
    if (facePayVault) {
      const files = await tusky.listFiles(facePayVault.id)
      faceCount = files.filter(f => f.name?.startsWith('face-')).length
    }
    
    return {
      vaultCount: vaults.length,
      facePayVaultExists: !!facePayVault,
      faceCount,
      configured: true
    }
  } catch (error) {
    console.error('Error getting Tusky storage info:', error)
    return {
      vaultCount: 0,
      facePayVaultExists: false,
      faceCount: 0,
      configured: false,
      error: error?.toString()
    }
  }
}

/**
 * Test Tusky connection
 */
export const testTuskyConnection = async (): Promise<boolean> => {
  try {
    const tusky = await getTuskyClient()
    await tusky.listVaults()
    return true
  } catch (error) {
    console.error('Tusky connection test failed:', error)
    return false
  }
}

// =============================================================================
// EXPORT DEFAULT CLIENT
// =============================================================================

export default {
  initializeTusky,
  getTuskyClient,
  getFacePayVault,
  generateFaceHash,
  prepareFaceData,
  uploadFaceDataToTusky,
  retrieveFaceDataFromTusky,
  listFaceData,
  deleteFaceDataFromTusky,
  findFaceByHash,
  findFacesBySuiAddress,
  isTuskyConfigured,
  getTuskyStorageInfo,
  testTuskyConnection,
} 