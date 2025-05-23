'use client'

import { useState, useCallback } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { SavedFace } from '../types'

interface TuskyState {
  isInitialized: boolean
  isLoading: boolean
  error: string | null
  logs: string[]
  vaultId: string | null
  sessionId: string | null
}

interface UseTuskyReturn {
  // State
  state: TuskyState
  
  // Actions
  initializeTusky: (password?: string) => Promise<boolean>
  signOut: () => void
  uploadFaceData: (faceData: SavedFace) => Promise<string | null>
  downloadFaceData: (fileId: string) => Promise<SavedFace | null>
  listFaceFiles: () => Promise<SavedFace[]>
  deleteFaceData: (fileId: string) => Promise<boolean>
  
  // Utilities
  clearLogs: () => void
  isReady: boolean
}

export function useTusky(): UseTuskyReturn {
  const account = useCurrentAccount()
  
  const [state, setState] = useState<TuskyState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    logs: [],
    vaultId: null,
    sessionId: null
  })
  
  const addLog = useCallback((message: string, methodCall?: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = methodCall 
      ? [`${timestamp}: ${message}`, `  → ${methodCall}`]
      : [`${timestamp}: ${message}`]
    
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, ...logEntry]
    }))
    
    console.log(`🐋 Tusky: ${message}${methodCall ? ` - ${methodCall}` : ''}`)
  }, [])
  
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
    if (error) {
      addLog(`Error: ${error}`)
    }
  }, [addLog])
  
  const initializeTusky = useCallback(async (password?: string): Promise<boolean> => {
    if (!account) {
      setError('SUI account is required for Tusky initialization')
      return false
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      addLog('Initializing Tusky via API...', 'POST /api/tusky/init')
      
      const response = await fetch('/api/tusky/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: account.address,
          password,
          useKeyPair: true
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to initialize Tusky')
      }
      
      // Update logs from API
      if (result.logs) {
        setState(prev => ({
          ...prev,
          logs: [...prev.logs, ...result.logs]
        }))
      }
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        vaultId: result.vaultId,
        sessionId: result.sessionId,
        error: null
      }))
      
      addLog('Tusky initialized successfully via API')
      return true
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      setState(prev => ({ ...prev, isLoading: false }))
      return false
    }
  }, [account, addLog, setError])
  
  const signOut = useCallback(async () => {
    if (state.sessionId) {
      addLog('Signing out from Tusky...', 'POST /api/tusky/signout')
      
      try {
        await fetch('/api/tusky/signout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: state.sessionId
          }),
        })
      } catch (error) {
        console.error('Error signing out:', error)
      }
      
      setState(prev => ({
        ...prev,
        isInitialized: false,
        vaultId: null,
        sessionId: null,
        error: null
      }))
      
      addLog('Signed out successfully')
    }
  }, [state.sessionId, addLog])
  
  const uploadFaceData = useCallback(async (faceData: SavedFace): Promise<string | null> => {
    if (!state.sessionId || !state.vaultId) {
      setError('Tusky not initialized or vault not found')
      return null
    }
    
    try {
      addLog('Uploading face data via API...', 'POST /api/tusky/upload')
      
      const response = await fetch('/api/tusky/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          faceData,
          vaultId: state.vaultId
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to upload face data')
      }
      
      addLog(`Face data uploaded successfully: ${result.fileId}`)
      return result.fileId
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Failed to upload face data: ${errorMessage}`)
      return null
    }
  }, [state.sessionId, state.vaultId, addLog, setError])
  
  const downloadFaceData = useCallback(async (fileId: string): Promise<SavedFace | null> => {
    if (!state.sessionId) {
      setError('Tusky not initialized')
      return null
    }
    
    try {
      addLog(`Downloading face data via API...`, 'POST /api/tusky/download')
      
      const response = await fetch('/api/tusky/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          fileId
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to download face data')
      }
      
      addLog(`Face data downloaded successfully: ${result.faceData.hash}`)
      return result.faceData
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Failed to download face data: ${errorMessage}`)
      return null
    }
  }, [state.sessionId, addLog, setError])
  
  const listFaceFiles = useCallback(async (): Promise<SavedFace[]> => {
    if (!state.sessionId || !state.vaultId) {
      setError('Tusky not initialized or vault not found')
      return []
    }
    
    try {
      addLog('Listing face files via API...', 'POST /api/tusky/list')
      
      const response = await fetch('/api/tusky/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          vaultId: state.vaultId
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to list face data')
      }
      
      addLog(`Retrieved ${result.faceData.length} face records`)
      return result.faceData || []
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Failed to list face data: ${errorMessage}`)
      return []
    }
  }, [state.sessionId, state.vaultId, addLog, setError])
  
  const deleteFaceData = useCallback(async (fileId: string): Promise<boolean> => {
    if (!state.sessionId) {
      setError('Tusky not initialized')
      return false
    }
    
    try {
      addLog(`Deleting face data via API...`, 'POST /api/tusky/delete')
      
      const response = await fetch('/api/tusky/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          fileId
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete face data')
      }
      
      addLog('Face data deleted successfully')
      return true
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Failed to delete face data: ${errorMessage}`)
      return false
    }
  }, [state.sessionId, addLog, setError])
  
  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }))
  }, [])
  
  const isReady = state.isInitialized && !state.isLoading && !state.error
  
  return {
    state,
    initializeTusky,
    signOut,
    uploadFaceData,
    downloadFaceData,
    listFaceFiles,
    deleteFaceData,
    clearLogs,
    isReady
  }
} 