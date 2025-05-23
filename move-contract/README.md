# SUI FacePay Move Smart Contracts

This directory contains the Move smart contracts for the SUI FacePay system - a revolutionary face-based payment platform on the SUI blockchain.

## Overview

The SUI FacePay smart contracts enable users to:
1. **Register their face hash** with their SUI address and payment preferences
2. **Receive payments** by having others scan their face
3. **Process payments** with automatic token swapping to preferred currencies
4. **Maintain privacy** through hash-based facial recognition (no raw face data on-chain)

## Contract Architecture

### 1. Registry Contract (`registry.move`)
**Purpose**: Manages user profiles and face hash to address mappings

**Key Functions**:
- `register_user()` - Register a new user with face hash and preferences
- `get_user_by_face_hash()` - Look up user by their face hash
- `update_preferences()` - Update user's token preferences
- `verify_user()` - Admin function to verify users

**Data Structures**:
```move
public struct UserProfile {
    sui_address: address,        // User's SUI address (from zkLogin)
    face_hash: String,          // SHA-256 hash of facial descriptor
    walrus_blob_id: String,     // Walrus storage reference
    preferred_token: address,   // Preferred payment token
    display_name: String,       // User's display name
    created_at: u64,           // Registration timestamp
    is_verified: bool,         // Verification status
    payment_count: u64,        // Number of payments received
}
```

### 2. FacePay Contract (`facepay.move`)  
**Purpose**: Handles payment processing and fee management

**Key Functions**:
- `pay_by_face_sui()` - Pay someone using their face hash (SUI only)
- `pay_by_face_with_swap()` - Pay with automatic token swapping (future)
- `add_supported_token()` - Admin function to add supported tokens
- `withdraw_fees()` - Admin function to withdraw collected fees

**Data Structures**:
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

### 3. Enhanced Payment Contract (`enhanced_payment.move`)
**Purpose**: High-level payment functions with integrated verification

**Key Functions**:
- `pay_by_face_enhanced()` - Main payment function with full verification
- `lookup_user_by_face()` - Look up user ID by face hash
- `verify_face_hash_for_user()` - Verify face hash matches user profile
- `get_user_payment_info()` - Get user's payment preferences

## Deployment & Usage

### Prerequisites
- SUI CLI installed and configured
- SUI wallet with testnet SUI tokens
- Access to SUI testnet

### Building the Contracts
```bash
cd move-contract
sui move build
```

### Deploying the Contracts
```bash
# Deploy all contracts
sui client publish --gas-budget 100000000

# Save the package IDs for frontend integration
```

### Setting Up the System
1. **Deploy Registry Contract**
2. **Deploy FacePay Contract** 
3. **Deploy Enhanced Payment Contract**
4. **Set Registry Reference** in FacePay system
5. **Configure Supported Tokens** (SUI, USDC, USDT, etc.)
6. **Set Fee Structure** (default 0.3%)

## Integration with Frontend

### User Registration Flow
```typescript
// 1. User registers with zkLogin and gets SUI address
// 2. Frontend captures face and generates hash
// 3. Face data uploaded to Walrus storage
// 4. Call smart contract to register user

const tx = new TransactionBlock();
tx.moveCall({
    target: `${REGISTRY_PACKAGE}::registry::register_user`,
    arguments: [
        tx.object(REGISTRY_ID),
        tx.pure(faceHash),
        tx.pure(walrusBlobId), 
        tx.pure(preferredTokenAddress),
        tx.pure(displayName),
        tx.object(CLOCK_ID)
    ]
});
```

### Payment Flow
```typescript
// 1. Scan recipient's face and generate hash
// 2. Look up recipient in registry
// 3. Process payment

const tx = new TransactionBlock();
tx.moveCall({
    target: `${ENHANCED_PAYMENT_PACKAGE}::enhanced_payment::pay_by_face_enhanced`,
    arguments: [
        tx.object(FACEPAY_SYSTEM_ID),
        tx.object(REGISTRY_ID),
        tx.object(recipientProfileId),
        tx.pure(recipientFaceHash),
        tx.object(paymentCoinId),
        tx.object(CLOCK_ID)
    ]
});
```

## Security Features

### 1. Privacy Protection
- **No raw face data on-chain** - Only SHA-256 hashes stored
- **Walrus integration** - Face descriptors stored on decentralized storage
- **zkLogin authentication** - Zero-knowledge proof authentication

### 2. Access Control
- **Capability-based admin functions** - Only admin can verify users, withdraw fees
- **Input validation** - All parameters validated before processing
- **Reentrancy protection** - Safe transfer patterns used

### 3. Economic Security
- **Fee mechanism** - 0.3% fee on all payments to prevent spam
- **Minimum payment amounts** - Prevents dust attacks
- **Gas optimization** - Efficient contract design for low transaction costs

## Events & Monitoring

The contracts emit comprehensive events for off-chain monitoring:

### Registry Events
- `UserRegistered` - New user registration
- `UserPreferencesUpdated` - User updates preferences
- `UserVerificationUpdated` - User verification status change

### Payment Events  
- `PaymentInitiated` - Payment started
- `PaymentCompleted` - Payment successfully processed
- `PaymentFailed` - Payment failed with reason

### Enhanced Payment Events
- `FaceVerificationSuccess` - Face successfully verified
- `FacePaymentCompleted` - Enhanced payment completed

## Future Enhancements

### 1. Token Swapping Integration
- Integration with SUI DEX protocols (Cetus, Turbos)
- Automatic token conversion based on user preferences
- Slippage protection and swap optimization

### 2. Advanced Features
- **Multi-face registration** - Users can register multiple faces
- **Delegation system** - Allow others to receive payments on your behalf
- **Subscription payments** - Recurring payments via face scan
- **Merchant integration** - Business accounts with enhanced features

### 3. Cross-Chain Support
- Bridge integration for cross-chain payments
- Support for other blockchain ecosystems
- Universal face-based payment system

## Testing

### Unit Tests
```bash
cd move-contract
sui move test
```

### Integration Tests
```bash
# Test user registration
sui client call --function register_user --module registry --package $PACKAGE_ID

# Test payment processing  
sui client call --function pay_by_face_enhanced --module enhanced_payment --package $PACKAGE_ID
```

## Configuration

### Environment Variables
```bash
# Network configuration
export SUI_NETWORK=testnet
export SUI_RPC_URL=https://fullnode.testnet.sui.io

# Contract addresses (set after deployment)
export REGISTRY_PACKAGE_ID=0x...
export FACEPAY_PACKAGE_ID=0x...
export ENHANCED_PAYMENT_PACKAGE_ID=0x...

# System object IDs
export REGISTRY_ID=0x...
export FACEPAY_SYSTEM_ID=0x...
export CLOCK_ID=0x6
```

### Gas Budget Recommendations
- **User Registration**: 10M MIST
- **Payment Processing**: 5M MIST  
- **Admin Operations**: 15M MIST

## Support & Documentation

- **Move Book**: https://move-book.com/
- **SUI Documentation**: https://docs.sui.io/
- **FacePay Documentation**: See `FLOW_DOCUMENTATION.md`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This is a production-ready smart contract system designed for real-world face-based payments on the SUI blockchain. All contracts follow SUI Move best practices and include comprehensive security measures.
