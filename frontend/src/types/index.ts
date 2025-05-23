// =============================================================================
// FACE RECOGNITION TYPES
// =============================================================================

export interface FaceDescriptor {
  descriptor: Float32Array
  landmarks?: any
  detection?: any
}

export interface ProfileData {
  name: string
  email?: string
  bio?: string
  linkedin?: string
  telegram?: string
  twitter?: string
  preferredToken: string
  suiAddress?: string
}

export interface SavedFace {
  id: string
  hash: string
  descriptor: number[]
  landmarks?: any
  detection?: any
  profileData: ProfileData
  tuskyFileId: string
  tuskyVaultId: string
  blobId?: string
  createdAt: string
  updatedAt: string
}

export interface FaceMatch {
  face: SavedFace
  distance: number
  confidence: number
}

export interface FaceRegistrationProps {
  onFaceSaved: (faces: SavedFace[]) => void
  savedFaces: SavedFace[]
}

export interface FaceRecognitionProps {
  savedFaces: SavedFace[]
  onPaymentRequest?: (recipient: SavedFace, amount: number) => void
}

// =============================================================================
// TUSKY STORAGE TYPES
// =============================================================================

export interface TuskyConfig {
  apiKey?: string
  endpoint?: string
  timeout?: number
}

export interface TuskyVault {
  id: string
  name: string
  description?: string
  encrypted: boolean
  createdAt: string
  updatedAt: string
}

export interface TuskyFile {
  id: string
  name: string
  mimeType: string
  size: number
  blobId?: string
  vaultId: string
  createdAt: string
  updatedAt: string
}

export interface TuskyUploadOptions {
  name?: string
  mimeType?: string
  metadata?: Record<string, any>
}

export interface TuskyUploadProgress {
  bytesUploaded: number
  bytesTotal: number
  percentage: number
}

// =============================================================================
// SUI BLOCKCHAIN TYPES
// =============================================================================

export interface SuiAccount {
  address: string
  publicKey?: string
}

export interface SuiTransaction {
  digest: string
  status: 'pending' | 'success' | 'failed'
  timestamp: number
  amount?: number
  sender?: string
  recipient?: string
  gasUsed?: number
}

export interface TokenBalance {
  coinType: string
  balance: number
  symbol: string
  decimals: number
}

// =============================================================================
// WALLET & AUTH TYPES
// =============================================================================

export interface WalletState {
  connected: boolean
  account?: SuiAccount
  balance?: TokenBalance[]
  network: 'mainnet' | 'testnet' | 'devnet'
}

export interface AuthState {
  isAuthenticated: boolean
  user?: {
    address: string
    profile?: ProfileData
  }
  authMethod?: 'zklogin' | 'wallet'
}

// =============================================================================
// UI COMPONENT TYPES
// =============================================================================

export interface CameraState {
  isLoading: boolean
  isReady: boolean
  error?: string
  stream?: MediaStream
}

export interface PaymentFormData {
  amount: number
  token: string
  message?: string
}

export interface TransactionState {
  loading: boolean
  error?: string
  success?: boolean
  txHash?: string
}

// =============================================================================
// APPLICATION STATE TYPES
// =============================================================================

export interface AppState {
  wallet: WalletState
  auth: AuthState
  faces: SavedFace[]
  transactions: SuiTransaction[]
  loading: boolean
  error?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const SUPPORTED_TOKENS = ['SUI', 'USDC', 'USDT', 'ETH'] as const
export type SupportedToken = typeof SUPPORTED_TOKENS[number]

export const TUSKY_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_TUSKY_API_KEY || '',
  endpoint: 'https://api.tusky.io',
  timeout: 30000,
} as const

export const SUI_NETWORKS = {
  mainnet: 'https://fullnode.mainnet.sui.io',
  testnet: 'https://fullnode.testnet.sui.io', 
  devnet: 'https://fullnode.devnet.sui.io',
} as const 