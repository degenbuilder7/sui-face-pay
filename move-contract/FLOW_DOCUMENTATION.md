# SUI FacePay - Complete Application Flow Documentation

## Overview

SUI FacePay is a revolutionary payment system that enables users to send SUI tokens to recipients by simply scanning their face. The system combines zkLogin for secure authentication, facial recognition for user identification, Walrus for decentralized storage, and SUI Move smart contracts for payment processing.

## Architecture Components

### 1. Smart Contracts (Move)
- **Registry Contract** (`registry.move`): Manages user profiles and face hash mappings
- **FacePay Contract** (`facepay.move`): Handles payment processing and token transfers  
- **Enhanced Payment Contract** (`enhanced_payment.move`): High-level payment functions with integrated verification

### 2. Frontend (Next.js)
- **Face Registration**: Captures and registers user facial data
- **Face Recognition**: Scans faces to identify payment recipients
- **Payment Interface**: Processes payments through smart contracts
- **zkLogin Integration**: Secure wallet authentication

### 3. Storage & Authentication
- **Walrus**: Decentralized storage for encrypted facial data
- **Tusky**: Additional storage layer for face data management
- **zkLogin**: Zero-knowledge proof authentication

## Complete User Flow

### Phase 1: User Registration & Face Registration

#### 1.1 User Authentication
```
User → zkLogin → Generate SUI Address → Connect Wallet
```

**Process:**
1. User visits the FacePay dapp
2. Clicks "Connect Wallet" 
3. zkLogin generates ephemeral key pair and SUI address
4. User is authenticated and can access the system

#### 1.2 Face Registration
```
User → Camera Access → Face Capture → Face Processing → On-Chain Registration
```

**Detailed Process:**
1. **Frontend (`FaceRegistration.tsx`)**:
   - User fills profile information (name, email, preferred token, social links)
   - Camera captures user's face using `react-webcam`
   - `face-api.js` processes the image:
     - Detects faces in the image
     - Extracts facial landmarks and descriptors
     - Generates unique face hash using SHA-256

2. **Face Data Storage**:
   - Facial descriptor data is uploaded to Walrus decentralized storage
   - Tusky API stores encrypted face data with blob ID
   - Face hash (not the actual face data) is prepared for on-chain storage

3. **Smart Contract Registration** (`registry.move`):
   ```move
   public fun register_user(
       registry: &mut UserRegistry,
       face_hash: String,           // SHA-256 hash of facial descriptor
       walrus_blob_id: String,      // Walrus storage reference
       preferred_token: address,    // User's preferred token (SUI, USDC, etc.)
       display_name: String,        // User's display name
       clock: &Clock,
       ctx: &mut TxContext
   ): ID
   ```

4. **On-Chain Data Structure**:
   ```move
   public struct UserProfile {
       sui_address: address,        // User's zkLogin address
       face_hash: String,          // Hashed facial descriptor  
       walrus_blob_id: String,     // Reference to Walrus storage
       preferred_token: address,   // Payment preference
       display_name: String,       // User's name
       created_at: u64,           // Registration timestamp
       is_verified: bool,         // Verification status
       payment_count: u64,        // Number of payments received
   }
   ```

### Phase 2: Payment Process (Face-to-Pay)

#### 2.1 Recipient Face Scanning
```
Payer → Camera Scan → Face Recognition → User Lookup → Payment Interface
```

**Process:**
1. **Face Scanning** (`FaceRecognition.tsx`):
   - Payer opens camera interface
   - System captures photo of recipient's face
   - `face-api.js` processes the captured image:
     - Detects face in image
     - Extracts facial descriptor
     - Generates face hash for matching

2. **User Lookup**:
   ```javascript
   // Frontend calls smart contract
   const userExists = await enhanced_payment::user_exists_by_face_hash(registry, faceHash)
   const userId = await enhanced_payment::lookup_user_by_face(registry, faceHash)
   ```

3. **Recipient Verification**:
   - System displays recipient's profile information
   - Payer confirms they want to pay this person
   - Payment amount is entered

#### 2.2 Payment Execution
```
Payment Details → Smart Contract Call → Token Transfer → Transaction Record
```

**Smart Contract Flow** (`enhanced_payment.move`):

1. **Enhanced Payment Function**:
   ```move
   public fun pay_by_face_enhanced(
       system: &mut FacePaySystem,
       registry: &UserRegistry,
       recipient_profile: &mut UserProfile,  // Recipient's profile object
       recipient_face_hash: String,          // Scanned face hash
       payment: Coin<SUI>,                   // Payment amount
       clock: &Clock,
       ctx: &mut TxContext
   ): ID
   ```

2. **Verification Steps**:
   ```move
   // Step 1: Verify face hash matches profile
   assert!(registry::verify_face_hash_matches(recipient_profile, recipient_face_hash), E_INVALID_FACE_HASH);
   
   // Step 2: Get recipient payment info
   let (recipient_address, preferred_token) = registry::get_payment_info_from_profile(recipient_profile);
   
   // Step 3: Ensure sender is not paying themselves
   assert!(sender != recipient_address, E_SAME_SENDER_RECIPIENT);
   ```

3. **Payment Processing**:
   ```move
   // Step 4: Process payment through facepay system
   let payment_id = facepay::pay_by_face_sui(
       system,
       registry, 
       recipient_face_hash,
       payment,
       clock,
       ctx
   );
   ```

4. **Fee Calculation & Transfer**:
   ```move
   // Calculate fee (0.3% default)
   let fee_amount = (payment_amount * system.fee_bps) / 10000;
   let net_amount = payment_amount - fee_amount;
   
   // Extract fee
   let fee_coin = coin::split(&mut payment, fee_amount, ctx);
   balance::join(&mut system.fee_balance, fee_balance);
   
   // Transfer remaining payment to recipient
   transfer::public_transfer(payment, recipient_address);
   ```

#### 2.3 Transaction Recording
```
Payment Success → Update Statistics → Emit Events → Create Receipt
```

**On-Chain Updates**:
1. **Payment Transaction Record**:
   ```move
   public struct PaymentTx {
       sender: address,
       recipient_face_hash: String,
       recipient_address: address,
       original_amount: u64,
       received_amount: u64,
       fee_amount: u64,
       timestamp: u64,
       status: u8,  // 0=pending, 1=completed, 2=failed
   }
   ```

2. **System Statistics Update**:
   ```move
   system.total_payments = system.total_payments + 1;
   system.total_volume = system.total_volume + payment_amount;
   recipient_profile.payment_count = recipient_profile.payment_count + 1;
   ```

3. **Event Emission**:
   ```move
   event::emit(PaymentCompleted {
       payment_id,
       sender,
       recipient_address,
       received_amount: net_amount,
       fee_amount,
       timestamp: current_time,
   });
   ```

## Advanced Features

### Future Token Swapping (Phase 3)
```
Different Token Payment → DEX Integration → Automatic Swap → Preferred Token Delivery
```

The system is designed to support automatic token swapping:

1. **Payer sends USDC, Recipient prefers SUI**
2. **Smart contract integrates with SUI DEX (Cetus, Turbos)**  
3. **Automatic swap: USDC → SUI**
4. **Recipient receives SUI (their preferred token)**

```move
public fun pay_by_face_with_swap_enhanced<T>(
    system: &mut FacePaySystem,
    registry: &UserRegistry,
    recipient_profile: &mut UserProfile,
    payment: Coin<T>,                    // Any supported token
    preferred_token_type: address,       // Recipient's preference
    max_slippage_bps: u64,              // Maximum acceptable slippage
    clock: &Clock,
    ctx: &mut TxContext
): ID
```

### Privacy & Security Features

#### 1. Zero-Knowledge Authentication
- **zkLogin**: Users authenticate without revealing private keys
- **Ephemeral key pairs**: Temporary keys for transaction signing
- **Address derivation**: Deterministic address generation from OAuth tokens

#### 2. Face Data Privacy
- **Hashing**: Only SHA-256 hashes stored on-chain, never raw face data
- **Encryption**: Face descriptors encrypted before storage
- **Decentralized storage**: Walrus ensures no single point of failure
- **Liveness detection**: Prevents spoofing with photos

#### 3. Smart Contract Security
- **Capability-based access**: Admin functions protected by capabilities
- **Input validation**: All parameters validated before processing
- **Reentrancy protection**: Safe transfer patterns used
- **Emergency controls**: Admin can pause system if needed

## Data Flow Summary

### Registration Flow
```
User Input → Face Capture → Processing → Encryption → Walrus Storage → Hash Generation → Smart Contract → On-Chain Profile
```

### Payment Flow  
```
Face Scan → Recognition → Hash Matching → User Lookup → Verification → Payment Processing → Token Transfer → Receipt Generation
```

### Integration Points

#### Frontend ↔ Smart Contracts
```javascript
// Registration
const userId = await registry.register_user(faceHash, walrusId, preferredToken, displayName);

// Payment lookup
const userExists = await enhanced_payment.user_exists_by_face_hash(registry, faceHash);
const paymentId = await enhanced_payment.pay_by_face_enhanced(system, registry, profile, faceHash, payment);
```

#### Storage Integration
```javascript
// Walrus storage
const blobId = await walrus.upload(encryptedFaceData);

// Tusky storage  
const fileId = await tusky.uploadFaceData(faceData);
```

## Benefits & Use Cases

### 1. Instant Payments
- No need to exchange wallet addresses
- No QR codes or contact sharing
- Just scan face and pay

### 2. Universal Compatibility
- Works with any SUI wallet
- Supports multiple tokens
- Cross-platform accessibility

### 3. Privacy Preservation
- Zero-knowledge authentication
- Encrypted face data storage
- Minimal on-chain footprint

### 4. Real-World Applications
- **Restaurants**: Pay by showing face to camera
- **Events**: Quick payments for tickets/concessions
- **P2P**: Easy friend-to-friend payments
- **Retail**: Fast checkout without cards/phones
- **Services**: Tip service providers instantly

## Technical Implementation Notes

### Smart Contract Deployment
1. Deploy `registry.move` first
2. Deploy `facepay.move` second  
3. Deploy `enhanced_payment.move` third
4. Set registry reference in facepay system
5. Configure supported tokens and fees

### Frontend Integration
1. Initialize face-api.js models
2. Set up Walrus/Tusky clients
3. Configure zkLogin providers
4. Connect to SUI network
5. Initialize smart contract clients

### Security Considerations
1. **Face data never leaves encrypted form**
2. **On-chain data is privacy-preserving**
3. **Smart contracts use safe transfer patterns**
4. **Rate limiting prevents abuse**
5. **Admin controls for emergency situations**

This completes the comprehensive flow documentation for the SUI FacePay system, showing how facial recognition, smart contracts, and decentralized storage work together to enable secure, private, and convenient face-based payments on the SUI blockchain.