import { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { SavedFace, DetectedFace, ProfileData } from '../types'
import FaceRegistration from '../components/face/FaceRegistration'
import FaceRecognition from '../components/face/FaceRecognition'
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'
import { ThemeToggle } from '@/components/ThemeToggle'
import GoogleLoginButton from '@/components/auth/GoogleLoginButton'
import { useZkLogin } from '@/hooks/useZkLogin'

const Home: NextPage = () => {
  const currentAccount = useCurrentAccount()
  const { user: zkLoginUser, isLoading: zkLoginLoading, logout } = useZkLogin()
  const [savedFaces, setSavedFaces] = useState<SavedFace[]>([])
  const [currentView, setCurrentView] = useState<'register' | 'recognize'>('register')
  const [matchedFace, setMatchedFace] = useState<DetectedFace | null>(null)

  // Load saved faces from localStorage on component mount
  useEffect(() => {
    const loadSavedFaces = () => {
      try {
        const saved = localStorage.getItem('sui-facepay-faces')
        if (saved) {
          const parsed = JSON.parse(saved)
          // Convert descriptor arrays back to Float32Array
          const processedFaces = parsed.map((face: any) => ({
            ...face,
            descriptor: new Float32Array(face.descriptor)
          }))
          setSavedFaces(processedFaces)
        }
      } catch (error) {
        console.error('❌ Error loading saved faces:', error)
      }
    }

    loadSavedFaces()
  }, [])

  // Save faces to localStorage whenever savedFaces changes
  useEffect(() => {
    if (savedFaces.length > 0) {
      try {
        // Convert Float32Array to regular arrays for JSON serialization
        const serializedFaces = savedFaces.map(face => ({
          ...face,
          descriptor: Array.from(face.descriptor)
        }))
        localStorage.setItem('sui-facepay-faces', JSON.stringify(serializedFaces))
      } catch (error) {
        console.error('❌ Error saving faces:', error)
      }
    }
  }, [savedFaces])

  const handleFaceSaved = (faces: SavedFace[]) => {
    setSavedFaces(faces)
    console.log('✅ Faces updated:', faces.length)
  }

  const handleFaceMatched = (face: DetectedFace) => {
    setMatchedFace(face)
    console.log('🎯 Face matched:', face.label.name)
  }

  const clearAllFaces = () => {
    if (confirm('Are you sure you want to clear all registered faces?')) {
      setSavedFaces([])
      localStorage.removeItem('sui-facepay-faces')
      setMatchedFace(null)
    }
  }

  return (
    <>
      <Head>
        <title>SUI FacePay - Pay by Face</title>
        <meta name="description" content="Revolutionary payment rails for SUI blockchain using facial recognition" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
        {/* Header */}
        <header className="glass-effect border-b border-white/20 sticky top-0 z-50 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-face-primary to-face-secondary rounded-lg flex items-center justify-center">
                  <span className="font-bold text-xl">🎭</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold gradient-text">SUI FacePay</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pay by Face</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex space-x-8">
                <button
                  onClick={() => setCurrentView('register')}
                  className={`px-3 py-2 rounded-lg transition-colors ${currentView === 'register'
                    ? 'bg-face-primary text-black dark:text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-face-primary dark:hover:text-face-primary'
                    }`}
                >
                  📝 Register
                </button>
                <button
                  onClick={() => setCurrentView('recognize')}
                  className={`px-3 py-2 rounded-lg transition-colors ${currentView === 'recognize'
                    ? 'bg-face-primary text-black dark:text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-face-primary dark:hover:text-face-primary'
                    }`}
                >
                  🎯 Recognize
                </button>
              </nav>

              {/* Wallet Connection & Auth */}
              <div className="flex items-center space-x-4">
                {savedFaces.length > 0 && (
                  <button
                    onClick={clearAllFaces}
                    className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    🗑️ Clear All
                  </button>
                )}
                
                {/* Show zkLogin status if authenticated */}
                {zkLoginUser && zkLoginUser.isAuthenticated ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="text-sm text-green-700 dark:text-green-400 font-medium">
                        zkLogin Connected
                      </div>
                    </div>
                    {zkLoginUser.wallet && (
                      <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {zkLoginUser.wallet.slice(0, 6)}...{zkLoginUser.wallet.slice(-4)}
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(zkLoginUser.wallet!)
                              // You could add a toast notification here
                            } catch (error) {
                              console.error('Failed to copy to clipboard:', error)
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Copy wallet address"
                        >
                          📋
                        </button>
                      </div>
                    )}
                    {zkLoginUser.name && (
                      <div className="flex items-center space-x-2">
                        {zkLoginUser.picture && (
                          <img 
                            src={zkLoginUser.picture} 
                            alt={zkLoginUser.name}
                            className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                          />
                        )}
                        <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {zkLoginUser.name}
                        </div>
                      </div>
                    )}
                    {/* Logout Button */}
                    <button
                      onClick={async () => {
                        try {
                          await logout()
                        } catch (error) {
                          console.error('❌ Error logging out:', error)
                        }
                      }}
                      className="flex items-center space-x-1 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                      title="Logout"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    🔐 zkLogin: Not connected
                  </div>
                )}
                
                <ConnectButton />
                <ThemeToggle />
              </div>


            </div>
          </div>
        </header>

        {/* Mobile Navigation */}
        <div className="md:hidden glass-effect border-b border-white/20 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex space-x-4 py-3">
              <button
                onClick={() => setCurrentView('register')}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors ${currentView === 'register'
                  ? 'bg-face-primary text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-face-primary dark:hover:text-face-primary'
                  }`}
              >
                📝 Register
              </button>
              <button
                onClick={() => setCurrentView('recognize')}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors ${currentView === 'recognize'
                  ? 'bg-face-primary text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-face-primary dark:hover:text-face-primary'
                  }`}
              >
                🎯 Recognize
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="py-8">
          {!currentAccount && !zkLoginUser?.isAuthenticated ? (
            /* Not Connected State */
            <div className="max-w-4xl mx-auto px-4 text-center">
              <div className="glass-effect rounded-3xl p-12 dark:bg-slate-900/50">
                <div className="w-24 h-24 bg-gradient-to-r from-face-primary to-face-secondary rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-white text-4xl">🎭</span>
                </div>
                <h1 className="text-4xl font-bold gradient-text mb-4">
                  Welcome to SUI FacePay
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                  Revolutionary payment rails for the SUI blockchain using advanced facial recognition technology.
                  Pay anyone instantly by simply scanning their face.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-6 bg-white/60 dark:bg-slate-800/60 rounded-xl">
                    <div className="text-3xl mb-3">🔐</div>
                    <h3 className="font-semibold mb-2 dark:text-white">Secure zkLogin</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Connect with zero-knowledge proofs for maximum security</p>
                  </div>
                  <div className="p-6 bg-white/60 dark:bg-slate-800/60 rounded-xl">
                    <div className="text-3xl mb-3">🎯</div>
                    <h3 className="font-semibold mb-2 dark:text-white">Face Recognition</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Advanced AI-powered facial recognition with privacy protection</p>
                  </div>
                  <div className="p-6 bg-white/60 dark:bg-slate-800/60 rounded-xl">
                    <div className="text-3xl mb-3">🐋</div>
                    <h3 className="font-semibold mb-2 dark:text-white">Walrus Storage</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Decentralized storage for your facial data on Walrus</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* zkLogin with Google */}
                  <div className="max-w-md mx-auto">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">
                      🔐 Connect with zkLogin (Recommended)
                    </h3>
                    <GoogleLoginButton className="w-full" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Secure authentication using zero-knowledge proofs
                    </p>
                  </div>

                  {/* OR separator */}
                  <div className="flex items-center justify-center">
                    <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                    <span className="px-4 text-sm text-gray-500 dark:text-gray-400">OR</span>
                    <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                  </div>

                  {/* Traditional wallet connection */}
                  <div className="max-w-md mx-auto">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">
                      💼 Connect Traditional Wallet
                    </h3>
                    <ConnectButton />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Connect using Sui, Petra, or other supported wallets
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Connect your SUI wallet to get started with facial recognition payments
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Connected State */
            <div>
              {/* Status Bar */}
              <div className="max-w-7xl mx-auto px-4 mb-6">
                <div className="glass-effect rounded-2xl p-4 dark:bg-slate-900/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium dark:text-white">Connected</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {currentAccount?.address ?
                          `${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}`
                          : 'Loading...'
                        }
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Registered Faces:
                        <span className="font-semibold text-face-primary ml-1">{savedFaces.length}</span>
                      </span>
                      {matchedFace && (
                        <span className="text-green-600 dark:text-green-400">
                          Last Match: <span className="font-semibold">{matchedFace.label.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              {currentView === 'register' ? (
                <FaceRegistration
                  onFaceSaved={handleFaceSaved}
                  savedFaces={savedFaces}
                />
              ) : (
                <FaceRecognition
                  savedFaces={savedFaces}
                  onFaceMatched={handleFaceMatched}
                />
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <span>Powered by SUI Blockchain</span>
              <span className="hidden sm:inline">•</span>
              <span>Built for SUI Overflow Hackathon</span>
              <span className="hidden sm:inline">•</span>
              <span>Secured by Walrus</span>
            </div>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              🎭 Your face data is encrypted and stored securely on decentralized storage
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}

export default Home
