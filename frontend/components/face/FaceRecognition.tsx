'use client'

import * as faceapi from 'face-api.js'
import { useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'
// import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { ProfileData, SavedFace, DetectedFace, FaceRecognitionProps } from '../../types'
import { retrieveFaceDataFromWalrus, generateFaceHash } from '../../utils/walrus'
import { useCurrentAccount } from '@mysten/dapp-kit'

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: 'user',
}

const createImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

const detectFacesInImage = async (image: HTMLImageElement) => {
  return await faceapi
    .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors()
}

const findBestMatch = (descriptor: Float32Array, savedFaces: SavedFace[], threshold = 0.6) => {
  let bestMatch: { face: SavedFace; distance: number } | null = null
  let minDistance = threshold

  for (const savedFace of savedFaces) {
    const distance = faceapi.euclideanDistance(descriptor, savedFace.descriptor)
    if (distance < minDistance) {
      minDistance = distance
      bestMatch = { face: savedFace, distance }
    }
  }

  return bestMatch
}

export default function FaceRecognition({ savedFaces, onFaceMatched }: FaceRecognitionProps) {
  const currentAccount = useCurrentAccount()
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isWebcamLoading, setIsWebcamLoading] = useState(true)
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const [matchedProfile, setMatchedProfile] = useState<ProfileData | null>(null)
  const [detectedFaceImage, setDetectedFaceImage] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [confidence, setConfidence] = useState<number>(0)

  // Speech recognition
//   const {
//     transcript,
//     listening,
//     resetTranscript,
//     browserSupportsSpeechRecognition,
//   } = useSpeechRecognition()

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models'
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        setIsModelLoaded(true)
      } catch (error) {
        console.error('❌ Error loading face-api.js models:', error)
      }
    }

    loadModels()
  }, [])

  // Handle speech transcript
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    if (transcript && isScanning) {
      if (timeoutId) clearTimeout(timeoutId)

      timeoutId = setTimeout(() => {
        const lowerTranscript = transcript.toLowerCase()
        if (
          (lowerTranscript.includes('pay') || lowerTranscript.includes('send')) &&
          matchedProfile
        ) {
          setCurrentTranscript(transcript)
          handlePaymentCommand(transcript)
        }
        resetTranscript()
      }, 2000)
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [transcript, isScanning, matchedProfile])

  const handleWebcamReady = () => {
    setIsWebcamLoading(false)
  }

  const handleWebcamError = (error: string | DOMException) => {
    console.error('❌ Webcam error:', error)
    setIsWebcamLoading(false)
    setWebcamError(
      typeof error === 'string'
        ? error
        : 'Could not access webcam. Please grant camera permissions.'
    )
  }

  const startScanning = () => {
    if (!isModelLoaded || !webcamRef.current) {
      alert('Please wait for models to load and webcam to initialize.')
      return
    }

    setIsScanning(true)
    setMatchedProfile(null)
    setDetectedFaceImage(null)
    setConfidence(0)

    // Start voice recognition if supported
    // if (browserSupportsSpeechRecognition) {
    //   SpeechRecognition.startListening({ continuous: true, language: 'en-US' })
    //   setIsListening(true)
    // }

    // Start continuous face detection
    intervalRef.current = setInterval(async () => {
      await detectAndMatchFaces()
    }, 1000) // Check every second
  }

  const stopScanning = () => {
    setIsScanning(false)
    setIsListening(false)

    // Stop voice recognition
    // if (browserSupportsSpeechRecognition) {
    //   SpeechRecognition.stopListening()
    // }

    // Stop face detection interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }

  const detectAndMatchFaces = async () => {
    if (!webcamRef.current || !isModelLoaded || savedFaces.length === 0) return

    try {
      const imageSrc = webcamRef.current.getScreenshot()
      if (!imageSrc) return

      const image = await createImageFromDataUrl(imageSrc)
      const detections = await detectFacesInImage(image)

      if (detections.length > 0) {
        // Find the largest face
        const largestFace = detections.reduce((largest, current) => {
          const currentArea = current.detection.box.width * current.detection.box.height
          const largestArea = largest.detection.box.width * largest.detection.box.height
          return currentArea > largestArea ? current : largest
        })

        // Try to match with saved faces
        const match = findBestMatch(largestFace.descriptor, savedFaces)
        
        if (match) {
          const matchConfidence = 1 - match.distance // Convert distance to confidence
          setConfidence(matchConfidence)
          setMatchedProfile(match.face.label)
          setDetectedFaceImage(imageSrc)
          
          // Draw face detection on canvas
          drawFaceOnCanvas(image, largestFace, match.face.label.name, matchConfidence)

          // Notify parent component
          if (onFaceMatched) {
            const detectedFace: DetectedFace = {
              detection: largestFace.detection,
              descriptor: largestFace.descriptor,
              label: match.face.label,
              matchedProfile: match.face.label,
              match: {
                label: match.face.label.name,
                distance: match.distance
              }
            }
            onFaceMatched(detectedFace)
          }
        } else {
          // No match found
          setMatchedProfile(null)
          setDetectedFaceImage(null)
          setConfidence(0)
          drawFaceOnCanvas(image, largestFace, 'Unknown', 0)
        }
      }
    } catch (error) {
      console.error('❌ Error in face detection:', error)
    }
  }

  const drawFaceOnCanvas = (
    image: HTMLImageElement,
    detection: any,
    name: string,
    confidence: number
  ) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match webcam
    canvas.width = image.width
    canvas.height = image.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw face detection box
    const box = detection.detection.box
    ctx.strokeStyle = confidence > 0.7 ? '#10B981' : confidence > 0.5 ? '#F59E0B' : '#EF4444'
    ctx.lineWidth = 3
    ctx.strokeRect(box.x, box.y, box.width, box.height)

    // Draw name and confidence
    ctx.fillStyle = ctx.strokeStyle
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
    const text = `${name} (${(confidence * 100).toFixed(1)}%)`
    const textWidth = ctx.measureText(text).width
    
    // Background for text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(box.x, box.y - 25, textWidth + 10, 20)
    
    // Text
    ctx.fillStyle = 'white'
    ctx.fillText(text, box.x + 5, box.y - 8)

    // Draw landmarks
    if (detection.landmarks) {
      ctx.fillStyle = '#06B6D4'
      detection.landmarks.positions.forEach((point: any) => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI)
        ctx.fill()
      })
    }
  }

  const handlePaymentCommand = (command: string) => {
    console.log('🎤 Payment command received:', command)
    // Extract amount from speech (basic implementation)
    const amountMatch = command.match(/(\d+(?:\.\d+)?)\s*(dollars?|bucks?|sui|usdc)/i)
    if (amountMatch && matchedProfile) {
      const amount = amountMatch[1]
      console.log(`💰 Initiating payment of ${amount} to ${matchedProfile.name}`)
      // Here you would integrate with the SUI Agent or payment system
      alert(`Payment of ${amount} to ${matchedProfile.name} initiated via voice command!`)
    }
  }

  if (!isModelLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="loading-dots">
            <div></div>
            <div></div>
            <div></div>
          </div>
          <p className="mt-4 text-lg font-medium">Loading face recognition models...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold gradient-text mb-2">Face Recognition Scanner</h1>
        <p className="text-gray-600">
          Scan faces to identify registered users and initiate payments
        </p>
      </div>

      {/* Scanner Section */}
      <div className="glass-effect rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">🎯 Face Scanner</h2>
          <div className="flex gap-2">
            {!isScanning ? (
              <button
                onClick={startScanning}
                disabled={!!webcamError}
                className="px-4 py-2 bg-face-primary text-white rounded-lg hover:bg-face-secondary transition-colors disabled:opacity-50"
              >
                🚀 Start Scanning
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                ⏹️ Stop Scanning
              </button>
            )}
          </div>
        </div>

        {/* Webcam Container */}
        <div className="relative mx-auto w-fit">
          {!webcamError ? (
            <>
              {isWebcamLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <div className="loading-dots">
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                    <p className="mt-2">Loading camera...</p>
                  </div>
                </div>
              )}
              
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                onUserMedia={handleWebcamReady}
                onUserMediaError={handleWebcamError}
                className="rounded-lg border-2 border-face-primary"
              />
              
              {/* Canvas overlay for face detection visualization */}
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 rounded-lg pointer-events-none"
              />

              {/* Scanning overlay */}
              {isScanning && (
                <div className="face-scan-overlay rounded-lg"></div>
              )}
            </>
          ) : (
            <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-red-500 mb-4">{webcamError}</p>
              <p className="text-gray-500">Please grant camera permissions and refresh the page</p>
            </div>
          )}
        </div>

        {/* Status Information */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Registered Faces</p>
            <p className="text-2xl font-bold text-face-primary">{savedFaces.length}</p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Scanner Status</p>
            <p className={`text-2xl font-bold ${isScanning ? 'text-green-500' : 'text-gray-400'}`}>
              {isScanning ? '🟢 Active' : '🔴 Inactive'}
            </p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Voice Recognition</p>
            <p className={`text-2xl font-bold ${isListening ? 'text-blue-500' : 'text-gray-400'}`}>
              {isListening ? '🎤 Listening' : '🔇 Off'}
            </p>
          </div>
        </div>
      </div>

      {/* Matched Profile */}
      {matchedProfile && (
        <div className="glass-effect rounded-2xl p-6 border-2 border-green-400">
          <h2 className="text-xl font-semibold mb-4 text-green-600">✅ Face Recognized!</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">{matchedProfile.name}</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Preferred Token:</span> {matchedProfile.preferredToken}</p>
                <p><span className="font-medium">Confidence:</span> {(confidence * 100).toFixed(1)}%</p>
                {matchedProfile.linkedin && (
                  <p><span className="font-medium">LinkedIn:</span> 
                    <a href={matchedProfile.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">
                      Profile
                    </a>
                  </p>
                )}
                {matchedProfile.twitter && (
                  <p><span className="font-medium">Twitter:</span> {matchedProfile.twitter}</p>
                )}
                {matchedProfile.telegram && (
                  <p><span className="font-medium">Telegram:</span> {matchedProfile.telegram}</p>
                )}
              </div>
            </div>
            
            {detectedFaceImage && (
              <div>
                <h4 className="font-medium mb-2">Detected Image</h4>
                <img
                  src={detectedFaceImage}
                  alt="Detected face"
                  className="w-full max-w-xs rounded-lg border-2 border-green-400"
                />
              </div>
            )}
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 <strong>Voice Commands:</strong> Say "Pay [amount] dollars" or "Send [amount] SUI" to initiate a payment
            </p>
            {currentTranscript && (
              <p className="text-sm text-gray-600 mt-2">
                Last command: "{currentTranscript}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {savedFaces.length === 0 && (
        <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Registered Faces</h3>
          <p className="text-gray-500">
            Register some faces first before using the scanner
          </p>
        </div>
      )}

      
    </div>
  )
} 