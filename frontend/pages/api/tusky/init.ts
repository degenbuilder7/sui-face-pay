import { NextApiRequest, NextApiResponse } from 'next'
import { Tusky } from "@tusky-io/ts-sdk"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"

interface TuskyInitRequest {
  walletAddress?: string
  password?: string
  useKeyPair?: boolean
}

interface TuskyInitResponse {
  success: boolean
  vaultId?: string
  sessionId?: string
  error?: string
  logs?: string[]
}

// Store Tusky instances per session (in production, use Redis or similar)
const tuskyInstances = new Map<string, Tusky>()
const logs: string[] = []

const addLog = (message: string, methodCall?: string) => {
  const timestamp = new Date().toLocaleTimeString()
  if (methodCall) {
    logs.push(`${timestamp}: ${message}`, `  → ${methodCall}`)
  } else {
    logs.push(`${timestamp}: ${message}`)
  }
  console.log(`🐋 Tusky API: ${message}${methodCall ? ` - ${methodCall}` : ''}`)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TuskyInitResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { walletAddress, password, useKeyPair }: TuskyInitRequest = req.body

    // Generate a session ID for this Tusky instance
    const sessionId = crypto.randomUUID()

    addLog('Initializing Tusky on server...', 'Tusky.init()')

    let tusky: Tusky

    if (useKeyPair) {
      // Use server-side keypair generation
      addLog('Generating Ed25519 keypair...', 'new Ed25519Keypair()')
      const keypair = new Ed25519Keypair()
      
      addLog('Initializing Tusky with keypair...', 'Tusky.init({ wallet: { keypair } })')
      tusky = await Tusky.init({ wallet: { keypair } })
    } else {
      // For now, we'll use keypair since wallet auth is complex on server
      // In production, you'd implement proper wallet verification
      addLog('Using default keypair initialization...')
      const keypair = new Ed25519Keypair()
      tusky = await Tusky.init({ wallet: { keypair } })
    }

    addLog('Signing in with Tusky...', 'tusky.auth.signIn()')
    await tusky.auth.signIn()

    // Set up encryption
    if (password) {
      addLog('Setting up password encryption...', 'tusky.addEncrypter({ password, keystore: true })')
      await tusky.addEncrypter({ password: password, keystore: true })
    } else {
      addLog('Setting up keystore encryption...', 'tusky.addEncrypter({ keystore: true })')
      await tusky.addEncrypter({ keystore: true })
    }

    // Get or create FacePay vault
    const vaultName = 'FacePay-Faces'
    addLog('Listing vaults...', 'tusky.vault.listAll()')
    const vaults = await tusky.vault.listAll()

    let vault = vaults.find((v: any) => v.name === vaultName)

    if (!vault) {
      addLog(`Creating new vault: ${vaultName}`, `tusky.vault.create("${vaultName}", { encrypted: true })`)
      vault = await tusky.vault.create(vaultName, { encrypted: true })
    } else {
      addLog(`Found existing vault: ${vaultName}`)
    }

    // Store the Tusky instance
    tuskyInstances.set(sessionId, tusky)

    addLog('Tusky initialized successfully')

    res.status(200).json({
      success: true,
      vaultId: vault.id,
      sessionId,
      logs: [...logs]
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    addLog(`Error initializing Tusky: ${errorMessage}`)
    console.error('❌ Tusky initialization failed:', error)
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      logs: [...logs]
    })
  }
}

// Helper function to get Tusky instance
export function getTuskyInstance(sessionId: string): Tusky | null {
  return tuskyInstances.get(sessionId) || null
}

// Helper function to cleanup session
export function cleanupTuskySession(sessionId: string): void {
  const tusky = tuskyInstances.get(sessionId)
  if (tusky) {
    try {
      tusky.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
    tuskyInstances.delete(sessionId)
  }
} 