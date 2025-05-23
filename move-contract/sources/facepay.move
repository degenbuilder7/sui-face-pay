/// FacePay main module for face-based payments
/// Handles payment processing with automatic token swapping
module facepay::facepay {
    use std::string::{Self, String};
    use std::vector;
    use std::option::{Self, Option};
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::package;
    use sui::display;
    use sui::table::{Self, Table};
    use facepay::registry::{Self, UserRegistry, UserProfile};

    // ====== Error Codes ======
    const E_NOT_AUTHORIZED: u64 = 0;
    const E_INSUFFICIENT_PAYMENT: u64 = 1;
    const E_RECIPIENT_NOT_FOUND: u64 = 2;
    const E_INVALID_AMOUNT: u64 = 3;
    const E_SAME_SENDER_RECIPIENT: u64 = 4;
    const E_TOKEN_NOT_SUPPORTED: u64 = 5;
    const E_INVALID_SWAP_PARAMS: u64 = 6;
    const E_SWAP_FAILED: u64 = 7;

    // ====== Constants ======
    const MIN_PAYMENT_AMOUNT: u64 = 1000000; // 0.001 SUI in MIST
    const MAX_SLIPPAGE_BPS: u64 = 5000; // 50% max slippage
    const DEFAULT_FEE_BPS: u64 = 30; // 0.3% fee
    const SUI_TOKEN_TYPE: address = @0x2;

    // ====== Structs ======

    /// One-time witness for module publisher
    public struct FACEPAY has drop {}

    /// Main FacePay system configuration
    public struct FacePaySystem has key {
        id: UID,
        /// Registry of supported tokens
        supported_tokens: Table<address, bool>,
        /// Minimum payment amounts per token
        min_amounts: Table<address, u64>,
        /// Fee percentage in basis points (100 = 1%)
        fee_bps: u64,
        /// Collected fees
        fee_balance: Balance<SUI>,
        /// Total number of payments processed
        total_payments: u64,
        /// Total volume processed in SUI
        total_volume: u64,
        /// Admin capability ID
        admin_cap: ID,
        /// User registry reference
        registry: ID,
    }

    /// Admin capability for system management
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Payment transaction record
    public struct PaymentTx has key, store {
        id: UID,
        /// Sender's address
        sender: address,
        /// Recipient's face hash
        recipient_face_hash: String,
        /// Recipient's SUI address
        recipient_address: address,
        /// Original token type used for payment
        original_token: address,
        /// Original amount sent
        original_amount: u64,
        /// Token type received by recipient
        received_token: address,
        /// Amount received by recipient (after fees and swaps)
        received_amount: u64,
        /// Fee amount deducted
        fee_amount: u64,
        /// Whether token swap was required
        swap_required: bool,
        /// Swap details/status
        swap_details: String,
        /// Transaction timestamp
        timestamp: u64,
        /// Payment status (0=pending, 1=completed, 2=failed)
        status: u8,
    }

    /// Parameters for token swapping
    public struct SwapParams has copy, drop, store {
        /// Input token address
        token_in: address,
        /// Output token address  
        token_out: address,
        /// Maximum slippage in basis points
        slippage_bps: u64,
        /// Minimum amount out expected
        min_amount_out: u64,
        /// Swap deadline timestamp
        deadline: u64,
    }

    // ====== Events ======

    /// Emitted when a payment is initiated
    public struct PaymentInitiated has copy, drop {
        payment_id: ID,
        sender: address,
        recipient_face_hash: String,
        recipient_address: address,
        original_token: address,
        original_amount: u64,
        timestamp: u64,
    }

    /// Emitted when a payment is completed
    public struct PaymentCompleted has copy, drop {
        payment_id: ID,
        sender: address,
        recipient_address: address,
        received_token: address,
        received_amount: u64,
        fee_amount: u64,
        swap_required: bool,
        timestamp: u64,
    }

    /// Emitted when a payment fails
    public struct PaymentFailed has copy, drop {
        payment_id: ID,
        sender: address,
        recipient_face_hash: String,
        reason: String,
        timestamp: u64,
    }

    // ====== Module Initializer ======

    /// Module initializer - creates system and admin capability
    fun init(witness: FACEPAY, ctx: &mut TxContext) {
        // Create admin capability
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        let admin_cap_id = object::id(&admin_cap);

        // Create main system
        let mut system = FacePaySystem {
            id: object::new(ctx),
            supported_tokens: table::new(ctx),
            min_amounts: table::new(ctx),
            fee_bps: DEFAULT_FEE_BPS,
            fee_balance: balance::zero<SUI>(),
            total_payments: 0,
            total_volume: 0,
            admin_cap: admin_cap_id,
            registry: object::id_from_address(@0x0), // Will be set after registry creation
        };

        // Add SUI as default supported token
        table::add(&mut system.supported_tokens, SUI_TOKEN_TYPE, true);
        table::add(&mut system.min_amounts, SUI_TOKEN_TYPE, MIN_PAYMENT_AMOUNT);

        // Transfer admin capability to deployer
        transfer::transfer(admin_cap, tx_context::sender(ctx));
        
        // Share system object
        transfer::share_object(system);

        // Create and setup display for PaymentTx
        let publisher = package::claim(witness, ctx);
        let mut display = display::new<PaymentTx>(&publisher, ctx);
        
        display::add(&mut display, string::utf8(b"name"), string::utf8(b"FacePay Transaction"));
        display::add(&mut display, string::utf8(b"description"), string::utf8(b"Face-based payment transaction"));
        display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"https://facepay.sui/tx/{id}"));
        
        display::update_version(&mut display);
        transfer::public_transfer(display, tx_context::sender(ctx));
        transfer::public_transfer(publisher, tx_context::sender(ctx));
    }

    // ====== Public Functions ======

    /// Set registry reference (admin only)
    public fun set_registry(
        _admin_cap: &AdminCap,
        system: &mut FacePaySystem,
        registry: &UserRegistry
    ) {
        system.registry = object::id(registry);
    }

    /// Pay someone by face hash (SUI only, no swap needed)
    /// This version requires the recipient's UserProfile to be provided for verification
    public fun pay_by_face_sui_with_profile(
        system: &mut FacePaySystem,
        registry: &UserRegistry,
        recipient_profile: &mut UserProfile,
        recipient_face_hash: String,
        mut payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        let sender = tx_context::sender(ctx);
        let payment_amount = coin::value(&payment);
        let current_time = clock::timestamp_ms(clock);

        // Validate payment amount
        assert!(payment_amount >= MIN_PAYMENT_AMOUNT, E_INVALID_AMOUNT);

        // Verify the face hash matches the provided profile
        assert!(registry::verify_face_hash_matches(recipient_profile, recipient_face_hash), E_RECIPIENT_NOT_FOUND);

        // Ensure sender is not paying themselves
        let (recipient_address, preferred_token) = registry::get_payment_info_from_profile(recipient_profile);
        assert!(sender != recipient_address, E_SAME_SENDER_RECIPIENT);

        // Calculate fee
        let fee_amount = (payment_amount * system.fee_bps) / 10000;
        let net_amount = payment_amount - fee_amount;

        // Create payment transaction record
        let payment_tx = PaymentTx {
            id: object::new(ctx),
            sender,
            recipient_face_hash,
            recipient_address,
            original_token: SUI_TOKEN_TYPE,
            original_amount: payment_amount,
            received_token: SUI_TOKEN_TYPE,
            received_amount: net_amount,
            fee_amount,
            swap_required: false,
            swap_details: string::utf8(b"No swap required - SUI to SUI"),
            timestamp: current_time,
            status: 1, // Completed
        };

        let payment_id = object::id(&payment_tx);

        // Extract fee
        let fee_coin = coin::split(&mut payment, fee_amount, ctx);
        let fee_balance = coin::into_balance(fee_coin);
        balance::join(&mut system.fee_balance, fee_balance);

        // Transfer remaining payment to recipient
        transfer::public_transfer(payment, recipient_address);

        // Update system stats
        system.total_payments = system.total_payments + 1;
        system.total_volume = system.total_volume + payment_amount;

        // Update recipient's payment count
        registry::increment_payment_count(recipient_profile);

        // Emit events
        event::emit(PaymentInitiated {
            payment_id,
            sender,
            recipient_face_hash,
            recipient_address,
            original_token: SUI_TOKEN_TYPE,
            original_amount: payment_amount,
            timestamp: current_time,
        });

        event::emit(PaymentCompleted {
            payment_id,
            sender,
            recipient_address,
            received_token: SUI_TOKEN_TYPE,
            received_amount: net_amount,
            fee_amount,
            swap_required: false,
            timestamp: current_time,
        });

        // Transfer payment record to sender
        transfer::transfer(payment_tx, sender);
        payment_id
    }

    /// Pay someone by face hash (SUI only) - Simplified version using face hash lookup
    /// Note: This version has limitations as it can't access UserProfile data directly
    public fun pay_by_face_sui(
        system: &mut FacePaySystem,
        registry: &UserRegistry,
        recipient_face_hash: String,
        mut payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        let sender = tx_context::sender(ctx);
        let payment_amount = coin::value(&payment);
        let current_time = clock::timestamp_ms(clock);

        // Validate payment amount
        assert!(payment_amount >= MIN_PAYMENT_AMOUNT, E_INVALID_AMOUNT);

        // Find recipient by face hash
        let recipient_id_opt = registry::get_user_by_face_hash(registry, recipient_face_hash);
        assert!(option::is_some(&recipient_id_opt), E_RECIPIENT_NOT_FOUND);

        // WARNING: This approach has limitations - we can't directly access UserProfile data
        // In practice, the frontend should provide the UserProfile object to the pay_by_face_sui_with_profile function
        let recipient_address = @0x1; // Placeholder - in real usage, would need to be resolved

        // Calculate fee
        let fee_amount = (payment_amount * system.fee_bps) / 10000;
        let net_amount = payment_amount - fee_amount;

        // Create payment transaction record
        let payment_tx = PaymentTx {
            id: object::new(ctx),
            sender,
            recipient_face_hash,
            recipient_address,
            original_token: SUI_TOKEN_TYPE,
            original_amount: payment_amount,
            received_token: SUI_TOKEN_TYPE,
            received_amount: net_amount,
            fee_amount,
            swap_required: false,
            swap_details: string::utf8(b"No swap required - SUI to SUI (simplified)"),
            timestamp: current_time,
            status: 1, // Completed
        };

        let payment_id = object::id(&payment_tx);

        // Extract fee
        let fee_coin = coin::split(&mut payment, fee_amount, ctx);
        let fee_balance = coin::into_balance(fee_coin);
        balance::join(&mut system.fee_balance, fee_balance);

        // Transfer remaining payment to recipient
        transfer::public_transfer(payment, recipient_address);

        // Update system stats
        system.total_payments = system.total_payments + 1;
        system.total_volume = system.total_volume + payment_amount;

        // Emit events
        event::emit(PaymentInitiated {
            payment_id,
            sender,
            recipient_face_hash,
            recipient_address,
            original_token: SUI_TOKEN_TYPE,
            original_amount: payment_amount,
            timestamp: current_time,
        });

        event::emit(PaymentCompleted {
            payment_id,
            sender,
            recipient_address,
            received_token: SUI_TOKEN_TYPE,
            received_amount: net_amount,
            fee_amount,
            swap_required: false,
            timestamp: current_time,
        });

        // Transfer payment record to sender
        transfer::transfer(payment_tx, sender);
        payment_id
    }

    /// Pay someone by face hash with automatic token swapping
    public fun pay_by_face_with_swap<T>(
        _system: &mut FacePaySystem,
        registry: &UserRegistry,
        recipient_face_hash: String,
        payment: Coin<T>,
        swap_params: SwapParams,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        let sender = tx_context::sender(ctx);
        let payment_amount = coin::value(&payment);
        let current_time = clock::timestamp_ms(clock);

        // Validate payment amount
        assert!(payment_amount >= MIN_PAYMENT_AMOUNT, E_INVALID_AMOUNT);

        // Validate swap parameters
        assert!(swap_params.slippage_bps <= MAX_SLIPPAGE_BPS, E_INVALID_SWAP_PARAMS);

        // Find recipient by face hash
        let recipient_id_opt = registry::get_user_by_face_hash(registry, recipient_face_hash);
        assert!(option::is_some(&recipient_id_opt), E_RECIPIENT_NOT_FOUND);

        // Get recipient's address and preferred token
        // This would be implemented with proper UserProfile access
        let recipient_address = @0x0; // Placeholder
        let preferred_token = SUI_TOKEN_TYPE; // Placeholder

        // Create payment transaction record (initial state)
        let payment_tx = PaymentTx {
            id: object::new(ctx),
            sender,
            recipient_face_hash,
            recipient_address,
            original_token: swap_params.token_in,
            original_amount: payment_amount,
            received_token: preferred_token,
            received_amount: 0, // Will be updated after swap
            fee_amount: 0, // Will be calculated after swap
            swap_required: true,
            swap_details: string::utf8(b"Token swap placeholder - returning payment to sender"),
            timestamp: current_time,
            status: 2, // Failed (placeholder implementation)
        };

        let payment_id = object::id(&payment_tx);

        // Emit initiation event
        event::emit(PaymentInitiated {
            payment_id,
            sender,
            recipient_face_hash,
            recipient_address,
            original_token: swap_params.token_in,
            original_amount: payment_amount,
            timestamp: current_time,
        });

        // NOTE: In a real implementation, the swap would happen here
        // For now, we'll return the payment to sender as this is a placeholder
        // TODO: Implement actual DEX integration for token swapping
        transfer::public_transfer(payment, sender);

        // Transfer payment record to sender
        transfer::transfer(payment_tx, sender);
        payment_id
    }

    /// Get user's preferred token from registry
    /// Note: This function shows how to look up a user ID by face hash
    public fun get_recipient_preferences(
        registry: &UserRegistry,
        face_hash: String
    ): option::Option<ID> { // Returns user ID if found
        registry::get_user_by_face_hash(registry, face_hash)
    }

    /// Get payment preferences from user profile
    public fun get_payment_preferences_from_profile(
        user_profile: &UserProfile
    ): (address, address) { // (recipient_address, preferred_token)
        registry::get_payment_info_from_profile(user_profile)
    }

    // ====== Admin Functions ======

    /// Add supported token (admin only)
    public fun add_supported_token(
        _admin_cap: &AdminCap,
        system: &mut FacePaySystem,
        token_address: address,
        min_amount: u64
    ) {
        table::add(&mut system.supported_tokens, token_address, true);
        table::add(&mut system.min_amounts, token_address, min_amount);
    }

    /// Remove supported token (admin only)
    public fun remove_supported_token(
        _admin_cap: &AdminCap,
        system: &mut FacePaySystem,
        token_address: address
    ) {
        if (table::contains(&system.supported_tokens, token_address)) {
            table::remove(&mut system.supported_tokens, token_address);
        };
        if (table::contains(&system.min_amounts, token_address)) {
            table::remove(&mut system.min_amounts, token_address);
        };
    }

    /// Update fee percentage (admin only)
    public fun update_fee_bps(
        _admin_cap: &AdminCap,
        system: &mut FacePaySystem,
        new_fee_bps: u64
    ) {
        assert!(new_fee_bps <= 1000, E_INVALID_AMOUNT); // Max 10% fee
        system.fee_bps = new_fee_bps;
    }

    /// Withdraw collected fees (admin only)
    public fun withdraw_fees(
        _admin_cap: &AdminCap,
        system: &mut FacePaySystem,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SUI> {
        assert!(balance::value(&system.fee_balance) >= amount, E_INSUFFICIENT_PAYMENT);
        let withdrawn_balance = balance::split(&mut system.fee_balance, amount);
        coin::from_balance(withdrawn_balance, ctx)
    }

    // ====== Helper Functions ======

    /// Calculate swap output amount with slippage
    public fun calculate_swap_output(
        amount_in: u64,
        exchange_rate: u64, // Rate multiplied by 1e8 for precision
        slippage_bps: u64
    ): u64 {
        let gross_output = (amount_in * exchange_rate) / 100000000; // Divide by 1e8
        let slippage_amount = (gross_output * slippage_bps) / 10000;
        gross_output - slippage_amount
    }

    /// Check if token is supported
    public fun is_token_supported(system: &FacePaySystem, token_address: address): bool {
        table::contains(&system.supported_tokens, token_address)
    }

    /// Get minimum payment amount for token
    public fun get_min_payment_amount(system: &FacePaySystem, token_address: address): u64 {
        if (table::contains(&system.min_amounts, token_address)) {
            *table::borrow(&system.min_amounts, token_address)
        } else {
            MIN_PAYMENT_AMOUNT
        }
    }

    // ====== Getter Functions ======

    /// Get system statistics
    public fun get_system_stats(system: &FacePaySystem): (u64, u64, u64) {
        (system.total_payments, system.total_volume, system.fee_bps)
    }

    /// Get payment transaction details
    public fun get_payment_details(payment_tx: &PaymentTx): (
        address, // sender
        String,  // recipient_face_hash
        address, // recipient_address
        address, // original_token
        u64,     // original_amount
        address, // received_token
        u64,     // received_amount
        u64,     // fee_amount
        bool,    // swap_required
        String,  // swap_details
        u64,     // timestamp
        u8       // status
    ) {
        (
            payment_tx.sender,
            payment_tx.recipient_face_hash,
            payment_tx.recipient_address,
            payment_tx.original_token,
            payment_tx.original_amount,
            payment_tx.received_token,
            payment_tx.received_amount,
            payment_tx.fee_amount,
            payment_tx.swap_required,
            payment_tx.swap_details,
            payment_tx.timestamp,
            payment_tx.status
        )
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(FACEPAY {}, ctx);
    }
} 