import { Tusky } from "@tusky-io/ts-sdk/web";
import { 
  TuskyUploadProgress,
  SavedFace,
  ProfileData,
  FaceDescriptor
} from '../types'

// =============================================================================
// TUSKY SDK CLIENT MANAGEMENT
// =============================================================================

interface TuskyInitOptions {
  signPersonalMessage: any
  account: any
  password?: string
}

interface TuskyResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  logs?: string[]
}

// =============================================================================
// CLIENT MANAGEMENT
// =============================================================================

let tuskyClient: Tusky | null = null
const logs: string[] = []

const addLog = (message: string, methodCall?: string) => {
  const timestamp = new Date().toLocaleTimeString();
  if (methodCall) {
    logs.push(`${timestamp}: ${message}`, `  → ${methodCall}`)
  } else {
    logs.push(`${timestamp}: ${message}`)
  }
  console.log(`🐋 Tusky: ${message}${methodCall ? ` - ${methodCall}` : ''}`)
}

/**
 * Initialize Tusky client with SUI wallet authentication
 */
export const initializeTusky = async (options: TuskyInitOptions): Promise<TuskyResponse<Tusky>> => {
  try {
    if (tuskyClient) {
      return { success: true, data: tuskyClient, logs: [...logs] }
    }

    const { signPersonalMessage, account, password } = options

    if (!account) {
      throw new Error('SUI account is required for Tusky initialization')
    }

    addLog('Initializing Tusky with wallet...', 'new Tusky({ wallet: { signPersonalMessage, account } })')
    
    // Initialize Tusky with wallet authentication
    const tusky = new Tusky({ wallet: { signPersonalMessage, account: account as any } })
    
    addLog('Signing in with wallet...', 'tusky.auth.signIn()')
    await tusky.auth.signIn()
    
    // Set up encryption if password provided
    if (password) {
      addLog('Setting up password encryption...', 'tusky.addEncrypter({ password, keystore: true })')
      await tusky.addEncrypter({ password: password, keystore: true })
    } else {
      // Use keystore encryption without password
      addLog('Setting up keystore encryption...', 'tusky.addEncrypter({ keystore: true })')
      await tusky.addEncrypter({ keystore: true })
    }
    
    tuskyClient = tusky
    addLog('Tusky initialized successfully')
    
    return { success: true, data: tusky, logs: [...logs] }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    addLog(`Error initializing Tusky: ${errorMessage}`)
    console.error('❌ Tusky initialization failed:', error)
    return { 
      success: false, 
      error: errorMessage,
      logs: [...logs]
    }
  }
}

/**
 * Get current Tusky client instance
 */
export const getTuskyClient = (): Tusky | null => {
  return tuskyClient
}

/**
 * Sign out from Tusky
 */
export const signOutTusky = () => {
  if (tuskyClient) {
    addLog('Signing out from Tusky...', 'tusky.signOut()')
    tuskyClient.signOut()
    tuskyClient = null
    addLog('Signed out successfully')
  }
}

// =============================================================================
// VAULT MANAGEMENT
// =============================================================================

/**
 * Create or get the FacePay vault for storing face data
 */
export const getFacePayVault = async (): Promise<TuskyResponse<any>> => {
  const tusky = getTuskyClient()
  
  try {
    if (!tusky) {
      throw new Error('Tusky client not initialized')
    }
    
    const vaultName = 'FacePay-Faces'
    
    addLog('Listing vaults...', 'tusky.vault.listAll()')
    const vaults = await tusky.vault.listAll()
    const existingVault = vaults.find((vault: any) => vault.name === vaultName)
    
    if (existingVault) {
      addLog(`Found existing vault: ${vaultName}`)
      return { success: true, data: existingVault, logs: [...logs] }
    }
    
    // Create new vault if not found
    addLog(`Creating new vault: ${vaultName}`, `tusky.vault.create("${vaultName}", { encrypted: true })`)
    const newVault = await tusky.vault.create(vaultName, { encrypted: true })
    
    if (!newVault) {
      throw new Error('Failed to create vault')
    }
    
    addLog(`Vault created successfully: ${newVault.id}`)
    return { success: true, data: newVault, logs: [...logs] }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    addLog(`Error managing FacePay vault: ${errorMessage}`)
    console.error('❌ Error managing FacePay vault:', error)
    return {
      success: false,
      error: errorMessage,
      logs: [...logs]
    }
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