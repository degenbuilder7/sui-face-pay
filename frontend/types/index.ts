import type { TransactionBlock } from '@mysten/sui.js/transactions'

// ====== User and Profile Types ======

export interface ProfileData {
  name: string
  linkedin?: string
  telegram?: string
  twitter?: string
  preferredToken?: string
  humanId?: string
  walrusDataId?: string
}

export interface SavedFace {
  label: ProfileData
  descriptor: Float32Array
}

export interface DetectedFace {
  detection: any // faceapi.FaceDetection
  descriptor: Float32Array
  isSelected?: boolean
  label: ProfileData
  matchedProfile?: ProfileData
  match?: {
    label: string
    distance: number
  }
}

// ====== Payment Types ======

export interface PaymentRequest {
  recipientFaceHash: string
  amount: string
  token?: string
  message?: string
}

export interface PaymentTransaction {
  id: string
  sender: string
  recipient: string
  recipientFaceHash: string
  originalToken: string
  originalAmount: string
  receivedToken: string
  receivedAmount: string
  feeAmount: string
  swapRequired: boolean
  swapDetails: string
  timestamp: number
  status: 'pending' | 'completed' | 'failed'
  txHash?: string
}

// ====== Agent Types ======

export interface AgentStep {
  label: string
  isLoading: boolean
  type: 'scan' | 'agent' | 'connection' | 'token' | 'transaction' | 'hash'
}

export interface AgentResponse {
  content: {
    text: string
    functionCall?: {
      functionName: string
      args: {
        recipientAddress?: string
        amount?: string
        ticker?: string
        platform?: string
        username?: string
      }
    }
  }
  proof?: {
    type: string
    timestamp: number
    metadata: {
      logId: string
    }
  }
}

// ====== Camera and Face Detection Types ======

export interface CameraProps {
  onCapture?: (imageSrc: string) => void
  onError?: (error: string) => void
  className?: string
}

export interface FaceDetectionOptions {
  minConfidence?: number
  maxResults?: number
  enableLandmarks?: boolean
  enableDescriptors?: boolean
}

export interface FaceRecognitionResult {
  faces: DetectedFace[]
  processingTime: number
  confidence: number
}

// ====== SUI Blockchain Types ======

export interface SuiAddress {
  address: string
  publicKey?: string
}

export interface SuiTokenInfo {
  type: string
  symbol: string
  decimals: number
  iconUrl?: string
  balance?: string
}

export interface SuiTransactionResult {
  digest: string
  effects: any
  events: any[]
  timestamp: number
  checkpoint?: string
}

// ====== zkLogin Types ======

export interface ZkLoginSession {
  address: string
  publicKey: string
  jwt: string
  salt: string
  provider: 'google' | 'facebook' | 'apple' | 'twitch'
  isValid: boolean
  expiresAt: number
}

export interface ZkLoginConfig {
  enabled: boolean
  providers: {
    google?: {
      clientId: string
    }
    facebook?: {
      clientId: string
    }
    apple?: {
      clientId: string
    }
  }
}

// ====== Walrus Storage Types ======

export interface WalrusUploadResult {
  blobId: string
  size: number
  uploadTime: number
}

export interface WalrusData {
  blobId: string
  data: any
  timestamp: number
  metadata?: Record<string, any>
}

// ====== Smart Contract Types ======

export interface FacePaySystemConfig {
  adminCap: string
  registry: string
  supportedTokens: string[]
  feeBps: number
  totalPayments: number
  totalVolume: string
}

export interface UserRegistryEntry {
  id: string
  suiAddress: string
  faceHash: string
  walrusBlobId: string
  preferredToken: string
  displayName: string
  createdAt: number
  updatedAt: number
  isVerified: boolean
  paymentCount: number
}

// ====== Store Types ======

export interface AuthState {
  isAuthenticated: boolean
  session: ZkLoginSession | null
  isLoading: boolean
  error: string | null
  login: (provider: string) => Promise<void>
  logout: () => void
  refreshSession: () => Promise<void>
}

export interface FaceState {
  savedFaces: SavedFace[]
  currentDetection: DetectedFace | null
  isModelLoaded: boolean
  isDetecting: boolean
  error: string | null
  addFace: (face: SavedFace) => void
  removeFace: (index: number) => void
  setCurrentDetection: (detection: DetectedFace | null) => void
  loadModels: () => Promise<void>
}

export interface PaymentState {
  transactions: PaymentTransaction[]
  currentPayment: PaymentRequest | null
  isProcessing: boolean
  error: string | null
  addTransaction: (tx: PaymentTransaction) => void
  updateTransaction: (id: string, updates: Partial<PaymentTransaction>) => void
  setCurrentPayment: (payment: PaymentRequest | null) => void
  processPayment: (payment: PaymentRequest) => Promise<string>
}

// ====== Component Props Types ======

export interface FaceRegistrationProps {
  onFaceSaved: (faces: SavedFace[]) => void
  savedFaces: SavedFace[]
  className?: string
}

export interface FaceRecognitionProps {
  savedFaces: SavedFace[]
  onFaceMatched?: (face: DetectedFace) => void
  className?: string
}

export interface PaymentInterfaceProps {
  recipient: ProfileData
  onPaymentSubmit: (amount: string, token: string) => void
  isLoading?: boolean
  className?: string
}

// ====== Utility Types ======

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ====== Configuration Types ======

export interface AppConfig {
  sui: {
    network: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
    rpcUrl: string
    contracts: {
      facepay: string
      registry: string
    }
  }
  walrus: {
    publisherUrl: string
    aggregatorUrl: string
    enabled: boolean
  }
  zkLogin: ZkLoginConfig
  faceRecognition: {
    modelPath: string
    confidence: number
    maxFaces: number
  }
}

// ====== Event Types ======

export interface PaymentInitiatedEvent {
  paymentId: string
  sender: string
  recipientFaceHash: string
  recipientAddress: string
  originalToken: string
  originalAmount: string
  timestamp: number
}

export interface PaymentCompletedEvent {
  paymentId: string
  sender: string
  recipientAddress: string
  receivedToken: string
  receivedAmount: string
  feeAmount: string
  swapRequired: boolean
  timestamp: number
}

export interface UserRegisteredEvent {
  userId: string
  suiAddress: string
  faceHash: string
  walrusBlobId: string
  timestamp: number
} 