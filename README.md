# SUI FacePay - Revolutionary Pay by Face Payment Rails

**🎭 Pay anyone by simply scanning their face with innovative facial recognition technology on the SUI blockchain**

Built for **SUI Overflow Hackathon** - The world's first decentralized payment rails using facial recognition, zkLogin authentication, and Walrus storage.

## 🌟 Project Overview

SUI FacePay enables users to:
- **Register** their face with zkLogin-generated SUI addresses
- **Scan faces** with a camera to identify recipients
- **Send payments** instantly through voice commands or UI
- **Auto-swap** to recipients' preferred tokens using SUI DEX protocols
- **Store facial data** securely using Walrus decentralized storage

## ✨ Key Features

### 🔐 Security & Privacy First
- **zkLogin Authentication**: Zero-knowledge proofs for maximum security
- **Walrus Storage**: Decentralized storage for facial data encryption
- **Hash-based Storage**: Only facial hashes stored on-chain, never raw images
- **Capability-based Security**: Smart contracts with proper access controls

### 🎯 Advanced Facial Recognition
- **Real-time Face Detection**: Using face-api.js with TensorFlow.js
- **High Accuracy Matching**: Confidence scoring and threshold controls
- **Liveness Detection**: Prevents spoofing with multiple validation checks
- **Multi-face Support**: Handle multiple faces in camera view

### 🗣️ Voice Command Integration
- **Speech Recognition**: "Pay 10 SUI to John" voice commands
- **Hands-free Operation**: Complete transactions without touching screen
- **Multi-language Support**: Voice commands in multiple languages

### 🔄 Intelligent Token Swapping
- **Automatic DEX Integration**: Pay in any token, recipient gets preferred token
- **Real-time Price Discovery**: Best rates across SUI DEX protocols
- **Low Slippage**: Optimized routing for minimal price impact

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Smart         │    │   Storage       │
│   - React/Next  │    │   Contracts     │    │   - Walrus      │
│   - Face API    │◄──►│   - Registry    │◄──►│   - IPFS        │
│   - zkLogin     │    │   - Payments    │    │   - On-chain    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Shadcn/ui
- **Blockchain**: SUI blockchain with Move smart contracts
- **Authentication**: zkLogin (OAuth + zero-knowledge proofs)
- **Storage**: Walrus decentralized storage
- **AI/ML**: face-api.js with TensorFlow.js for facial recognition
- **Transactions**: @0xkamal7/sui-agent for intelligent payment processing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- bun (recommended) or npm
- Modern browser with camera access

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/payment-rail.git
cd payment-rail/frontend
```

2. **Install dependencies**
```bash
bun install
# or
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# SUI Network Configuration
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io

# Walrus Configuration
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space

# zkLogin Configuration
NEXT_PUBLIC_ZKLOGIN_ENABLED=true
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

4. **Start the development server**
```bash
bun dev
# or
npm run dev
```

5. **Open in browser**
Navigate to `http://localhost:3000`

## 📱 How to Use

### 1. Connect Wallet
- Click "Connect Wallet" 
- Authenticate with zkLogin (Google/Facebook/Apple)
- Your SUI address will be generated automatically

### 2. Register Your Face
- Go to "Register" tab
- Fill in your profile information
- Grant camera permissions
- Capture your face photo
- System will detect faces and upload to Walrus
- Your facial hash gets stored on-chain

### 3. Scan and Pay
- Go to "Recognize" tab  
- Point camera at recipient's face
- System identifies the person automatically
- Say "Pay 10 SUI" or use the UI
- Transaction executes with auto-swap if needed

## 🛠️ Development

### Project Structure
```
frontend/
├── src/
│   ├── components/         # React components
│   │   ├── face/          # Face recognition components
│   │   └── ui/            # UI components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   ├── pages/             # Next.js pages
│   ├── styles/            # CSS and styling
│   ├── types/             # TypeScript definitions
│   └── utils/             # Helper functions
├── public/
│   └── models/            # Face-api.js models
└── move-contract/         # SUI Move contracts
```

### Smart Contracts

#### Registry Contract
```move
module facepay::registry {
    public fun register_user(
        faceHash: vector<u8>,
        walrusBlobId: String,
        preferredToken: String
    ) { ... }
    
    public fun get_user_by_face_hash(
        faceHash: vector<u8>
    ): UserProfile { ... }
}
```

#### Payment Contract  
```move
module facepay::face_pay {
    public fun pay_by_face(
        recipientFaceHash: vector<u8>,
        amount: u64,
        sourceToken: String
    ) { ... }
}
```

### Key Components

#### Face Registration
- **Location**: `src/components/face/FaceRegistration.tsx`
- **Purpose**: Handle face capture, processing, and blockchain registration
- **Features**: Multi-face detection, profile forms, Walrus upload

#### Face Recognition
- **Location**: `src/components/face/FaceRecognition.tsx`  
- **Purpose**: Real-time face scanning and payment initiation
- **Features**: Continuous detection, voice commands, confidence scoring

## 🔧 Configuration

### Face Recognition Settings
```typescript
const faceRecognitionConfig = {
  minConfidence: 0.7,        // Minimum match confidence
  maxResults: 5,             // Max faces to detect
  enableLandmarks: true,     // Facial landmarks
  enableDescriptors: true,   // Face descriptors
}
```

### Walrus Storage Settings
```typescript
const walrusConfig = {
  publisherUrl: process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL,
  aggregatorUrl: process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL,
  retentionEpochs: 5,       // Storage duration
}
```

## 🧪 Testing

### Run Tests
```bash
bun test
# or  
npm test
```

### Test Face Recognition
1. Use different lighting conditions
2. Test with multiple faces in frame
3. Verify voice command recognition
4. Check payment flow end-to-end

### Test Smart Contracts
```bash
cd move-contract
sui move test
```

## 🔒 Security Considerations

### Facial Data Protection
- Raw facial images are NEVER stored
- Only cryptographic hashes stored on-chain
- Encrypted data stored on Walrus
- Local processing prevents data leakage

### Authentication Security
- zkLogin provides zero-knowledge authentication
- Ephemeral keys for transaction signing
- No private keys stored in browser
- Capability-based smart contract access

### Payment Security
- Multi-signature transaction validation
- Slippage protection on token swaps
- Rate limiting to prevent abuse
- Transaction amount limits

## 🌐 Deployment

### Environment Setup
1. Deploy Move contracts to SUI testnet/mainnet
2. Configure Walrus storage endpoints
3. Set up zkLogin OAuth applications
4. Deploy frontend to Vercel/Netlify

### Production Checklist
- [ ] Security audit of smart contracts
- [ ] Performance testing of face recognition
- [ ] Rate limiting implementation
- [ ] Error monitoring setup
- [ ] Backup recovery procedures

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Write comprehensive tests
- Use conventional commits
- Update documentation
- Ensure security best practices

## 📋 Roadmap

### Phase 1: Core Features ✅
- [x] Basic face registration and recognition
- [x] zkLogin integration
- [x] Walrus storage integration
- [x] Basic payment functionality

### Phase 2: Enhanced Features 🚧
- [ ] Multi-person payment splitting
- [ ] Merchant integration APIs
- [ ] Mobile app development
- [ ] Advanced voice commands

### Phase 3: Enterprise Features 📅
- [ ] KYC/AML compliance
- [ ] Enterprise dashboard
- [ ] Analytics and reporting
- [ ] White-label solutions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **SUI Foundation** for the amazing blockchain platform
- **Walrus Team** for decentralized storage solutions
- **face-api.js** for facial recognition capabilities
- **TensorFlow.js** for machine learning in the browser
- **SUI Overflow Hackathon** for the opportunity to build

## 📞 Support

- **Documentation**: [Wiki Pages](wiki/)
- **Issues**: [GitHub Issues](issues/)
- **Discussions**: [GitHub Discussions](discussions/)
- **Discord**: [SUI Developer Community](https://discord.gg/sui)

---

**Built with ❤️ for the SUI Overflow Hackathon**

*Revolutionizing payments through facial recognition and blockchain technology*
