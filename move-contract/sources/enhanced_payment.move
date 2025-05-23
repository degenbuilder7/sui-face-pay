/// Enhanced Payment module for FacePay system
/// Provides high-level payment functions that properly integrate registry and payment logic
module facepay::enhanced_payment {
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::clock::{Self, Clock};
    use facepay::registry::{Self, UserRegistry, UserProfile};
    use facepay::facepay::{Self, FacePaySystem};

    // ====== Error Codes ======
    const E_USER_NOT_FOUND: u64 = 0;
    const E_INVALID_FACE_HASH: u64 = 1;
    const E_SAME_SENDER_RECIPIENT: u64 = 2;
    const E_INSUFFICIENT_PAYMENT: u64 = 3;

    // ====== Enhanced Payment Events ======

    /// Emitted when a face-based payment is successfully processed
    public struct FacePaymentCompleted has copy, drop {
        payment_id: ID,
        sender: address,
        recipient_face_hash: String,
        recipient_address: address,
        preferred_token: address,
        amount_paid: u64,
        fee_amount: u64,
        timestamp: u64,
    }

    /// Emitted when face verification is successful
    public struct FaceVerificationSuccess has copy, drop {
        face_hash: String,
        recipient_address: address,
        timestamp: u64,
    }

    // ====== Main Payment Functions ======

    /// Enhanced face-based payment that properly verifies user and processes payment
    /// This is the main function that the frontend should use for face payments
    public fun pay_by_face_enhanced(
        system: &mut FacePaySystem,
        registry: &UserRegistry,
        recipient_profile: &mut UserProfile,
        recipient_face_hash: String,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // Step 1: Verify the face hash matches the provided profile
        assert!(
            registry::verify_face_hash_matches(recipient_profile, recipient_face_hash), 
            E_INVALID_FACE_HASH
        );

        // Step 2: Get recipient payment info
        let (recipient_address, preferred_token) = registry::get_payment_info_from_profile(recipient_profile);
        
        // Step 3: Ensure sender is not paying themselves
        assert!(sender != recipient_address, E_SAME_SENDER_RECIPIENT);

        // Step 4: Emit face verification success event
        event::emit(FaceVerificationSuccess {
            face_hash: recipient_face_hash,
            recipient_address,
            timestamp: current_time,
        });

        // Step 5: Get payment amount before processing
        let payment_amount = coin::value(&payment);

        // Step 6: Process payment through the facepay system
        let payment_id = facepay::pay_by_face_sui(
            system,
            registry,
            recipient_face_hash,
            payment,
            clock,
            ctx
        );

        // Step 7: Emit enhanced payment completion event
        event::emit(FacePaymentCompleted {
            payment_id,
            sender,
            recipient_face_hash,
            recipient_address,
            preferred_token,
            amount_paid: payment_amount,
            fee_amount: 0, // Would be calculated from system
            timestamp: current_time,
        });

        payment_id
    }

    /// Look up user by face hash and return their profile ID
    /// This can be used by the frontend to fetch the UserProfile object
    public fun lookup_user_by_face(
        registry: &UserRegistry,
        face_hash: String
    ): Option<ID> {
        registry::get_user_by_face_hash(registry, face_hash)
    }

    /// Verify that a face hash corresponds to a specific user profile
    public fun verify_face_hash_for_user(
        user_profile: &UserProfile,
        face_hash: String
    ): bool {
        registry::verify_face_hash_matches(user_profile, face_hash)
    }

    /// Get payment information for a user (address and preferred token)
    public fun get_user_payment_info(
        user_profile: &UserProfile
    ): (address, address) {
        registry::get_payment_info_from_profile(user_profile)
    }

    /// Check if a user exists in the registry by face hash
    public fun user_exists_by_face_hash(
        registry: &UserRegistry,
        face_hash: String
    ): bool {
        registry::user_exists_by_face(registry, face_hash)
    }

    /// Get user's display name and verification status
    public fun get_user_display_info(
        user_profile: &UserProfile
    ): (String, bool) { // (display_name, is_verified)
        let (_, _, _, _, display_name, _, _, is_verified, _) = registry::get_user_info(user_profile);
        (display_name, is_verified)
    }

    // ====== Future Token Swap Integration ======

    /// Future function for payments with automatic token swapping
    /// This would integrate with SUI DEX protocols for token conversion
    public fun pay_by_face_with_swap_enhanced<T>(
        _system: &mut FacePaySystem,
        _registry: &UserRegistry,
        _recipient_profile: &mut UserProfile,
        _recipient_face_hash: String,
        payment: Coin<T>,
        _preferred_token_type: address,
        _max_slippage_bps: u64,
        _clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        // TODO: Implement DEX integration for automatic token swapping
        // This would:
        // 1. Verify face hash and get user preferences
        // 2. Check if token swap is needed (payment token != preferred token)
        // 3. Execute swap through SUI DEX (Cetus, Turbos, etc.)
        // 4. Transfer swapped tokens to recipient
        // 5. Handle slippage and swap failures
        
        // For now, transfer the payment back to sender and return a placeholder ID
        transfer::public_transfer(payment, tx_context::sender(ctx));
        object::id_from_address(@0x0)
    }

    // ====== Analytics and Statistics ======

    /// Get comprehensive user statistics
    public fun get_user_statistics(
        user_profile: &UserProfile
    ): (u64, u64, bool) { // (created_at, payment_count, is_verified)
        let (_, _, _, _, _, created_at, _, is_verified, payment_count) = registry::get_user_info(user_profile);
        (created_at, payment_count, is_verified)
    }
} 