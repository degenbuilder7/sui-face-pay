/// Registry module for FacePay system
/// Manages facial hash to address mapping and user preferences
module facepay::registry {
    use std::string::{Self, String};
    use std::vector;
    use std::option::{Self, Option};
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::package;
    use sui::display;

    // ====== Error Codes ======
    const E_NOT_AUTHORIZED: u64 = 0;
    const E_USER_ALREADY_EXISTS: u64 = 1;
    const E_USER_NOT_FOUND: u64 = 2;
    const E_INVALID_FACE_HASH: u64 = 3;
    const E_INVALID_TOKEN_ADDRESS: u64 = 4;

    // ====== Structs ======

    /// One-time witness for module publisher
    public struct REGISTRY has drop {}

    /// Main registry object containing all user mappings
    public struct UserRegistry has key {
        id: UID,
        /// Maps facial hash to user profile ID
        face_to_user: Table<String, ID>,
        /// Maps SUI address to user profile ID  
        address_to_user: Table<address, ID>,
        /// Total number of registered users
        user_count: u64,
        /// Registry admin capabilities
        admin_cap: ID,
    }

    /// Admin capability for registry management
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Individual user profile
    public struct UserProfile has key, store {
        id: UID,
        /// User's SUI address (from zkLogin)
        sui_address: address,
        /// SHA-256 hashed facial descriptor
        face_hash: String,
        /// Walrus blob ID storing facial data
        walrus_blob_id: String,
        /// Preferred token for receiving payments (default SUI)
        preferred_token: address,
        /// User's display name (optional)
        display_name: String,
        /// Registration timestamp
        created_at: u64,
        /// Last updated timestamp
        updated_at: u64,
        /// Whether user is verified
        is_verified: bool,
        /// Number of successful payments received
        payment_count: u64,
    }

    // ====== Events ======

    /// Emitted when a new user registers
    public struct UserRegistered has copy, drop {
        user_id: ID,
        sui_address: address,
        face_hash: String,
        walrus_blob_id: String,
        timestamp: u64,
    }

    /// Emitted when user preferences are updated
    public struct UserPreferencesUpdated has copy, drop {
        user_id: ID,
        sui_address: address,
        preferred_token: address,
        display_name: String,
        timestamp: u64,
    }

    /// Emitted when user verification status changes
    public struct UserVerificationUpdated has copy, drop {
        user_id: ID,
        sui_address: address,
        is_verified: bool,
        timestamp: u64,
    }

    // ====== Module Initializer ======

    /// Module initializer - creates registry and admin capability
    fun init(witness: REGISTRY, ctx: &mut TxContext) {
        // Create admin capability
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        let admin_cap_id = object::id(&admin_cap);

        // Create main registry
        let registry = UserRegistry {
            id: object::new(ctx),
            face_to_user: table::new(ctx),
            address_to_user: table::new(ctx),
            user_count: 0,
            admin_cap: admin_cap_id,
        };

        // Transfer admin capability to deployer
        transfer::transfer(admin_cap, tx_context::sender(ctx));
        
        // Share registry object
        transfer::share_object(registry);

        // Create and setup display for UserProfile
        let publisher = package::claim(witness, ctx);
        let mut display = display::new<UserProfile>(&publisher, ctx);
        
        display::add(&mut display, string::utf8(b"name"), string::utf8(b"FacePay User Profile"));
        display::add(&mut display, string::utf8(b"description"), string::utf8(b"User profile for FacePay facial recognition payments"));
        display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"https://facepay.sui/profile/{id}"));
        display::add(&mut display, string::utf8(b"project_url"), string::utf8(b"https://facepay.sui"));
        
        display::update_version(&mut display);
        transfer::public_transfer(display, tx_context::sender(ctx));
        transfer::public_transfer(publisher, tx_context::sender(ctx));
    }

    // ====== Public Functions ======

    /// Register a new user with facial hash
    public fun register_user(
        registry: &mut UserRegistry,
        face_hash: String,
        walrus_blob_id: String,
        preferred_token: address,
        display_name: String,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // Validate inputs
        assert!(!string::is_empty(&face_hash), E_INVALID_FACE_HASH);
        assert!(!table::contains(&registry.face_to_user, face_hash), E_USER_ALREADY_EXISTS);
        assert!(!table::contains(&registry.address_to_user, sender), E_USER_ALREADY_EXISTS);

        // Create user profile
        let user_profile = UserProfile {
            id: object::new(ctx),
            sui_address: sender,
            face_hash,
            walrus_blob_id,
            preferred_token,
            display_name,
            created_at: current_time,
            updated_at: current_time,
            is_verified: false,
            payment_count: 0,
        };

        let user_id = object::id(&user_profile);

        // Add to registries
        table::add(&mut registry.face_to_user, user_profile.face_hash, user_id);
        table::add(&mut registry.address_to_user, sender, user_id);
        registry.user_count = registry.user_count + 1;

        // Emit event
        event::emit(UserRegistered {
            user_id,
            sui_address: sender,
            face_hash: user_profile.face_hash,
            walrus_blob_id: user_profile.walrus_blob_id,
            timestamp: current_time,
        });

        // Transfer profile to user
        transfer::transfer(user_profile, sender);
        user_id
    }

    /// Update user preferences
    public fun update_preferences(
        registry: &mut UserRegistry,
        user_profile: &mut UserProfile,
        preferred_token: address,
        display_name: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(user_profile.sui_address == sender, E_NOT_AUTHORIZED);

        let current_time = clock::timestamp_ms(clock);

        // Update preferences
        user_profile.preferred_token = preferred_token;
        user_profile.display_name = display_name;
        user_profile.updated_at = current_time;

        // Emit event
        event::emit(UserPreferencesUpdated {
            user_id: object::id(user_profile),
            sui_address: sender,
            preferred_token,
            display_name,
            timestamp: current_time,
        });
    }

    /// Get user by facial hash
    public fun get_user_by_face_hash(registry: &UserRegistry, face_hash: String): Option<ID> {
        if (table::contains(&registry.face_to_user, face_hash)) {
            option::some(*table::borrow(&registry.face_to_user, face_hash))
        } else {
            option::none()
        }
    }

    /// Get user by SUI address
    public fun get_user_by_address(registry: &UserRegistry, sui_address: address): Option<ID> {
        if (table::contains(&registry.address_to_user, sui_address)) {
            option::some(*table::borrow(&registry.address_to_user, sui_address))
        } else {
            option::none()
        }
    }

    /// Get user payment info directly from user profile
    /// This function extracts payment-relevant info from a user profile
    public fun get_payment_info_from_profile(user_profile: &UserProfile): (address, address) {
        (user_profile.sui_address, user_profile.preferred_token)
    }

    /// Helper function to verify face hash matches profile
    public fun verify_face_hash_matches(user_profile: &UserProfile, face_hash: String): bool {
        user_profile.face_hash == face_hash
    }

    /// Check if user exists by face hash
    public fun user_exists_by_face(registry: &UserRegistry, face_hash: String): bool {
        table::contains(&registry.face_to_user, face_hash)
    }

    /// Check if user exists by address
    public fun user_exists_by_address(registry: &UserRegistry, sui_address: address): bool {
        table::contains(&registry.address_to_user, sui_address)
    }

    /// Increment payment count for user
    public fun increment_payment_count(user_profile: &mut UserProfile) {
        user_profile.payment_count = user_profile.payment_count + 1;
    }

    // ====== Admin Functions ======

    /// Verify a user (admin only)
    public fun verify_user(
        _admin_cap: &AdminCap,
        user_profile: &mut UserProfile,
        clock: &Clock
    ) {
        user_profile.is_verified = true;
        user_profile.updated_at = clock::timestamp_ms(clock);

        event::emit(UserVerificationUpdated {
            user_id: object::id(user_profile),
            sui_address: user_profile.sui_address,
            is_verified: true,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Unverify a user (admin only)
    public fun unverify_user(
        _admin_cap: &AdminCap,
        user_profile: &mut UserProfile,
        clock: &Clock
    ) {
        user_profile.is_verified = false;
        user_profile.updated_at = clock::timestamp_ms(clock);

        event::emit(UserVerificationUpdated {
            user_id: object::id(user_profile),
            sui_address: user_profile.sui_address,
            is_verified: false,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    // ====== Getter Functions ======

    /// Get user profile details
    public fun get_user_info(user_profile: &UserProfile): (
        address, // sui_address
        String,  // face_hash
        String,  // walrus_blob_id
        address, // preferred_token
        String,  // display_name
        u64,     // created_at
        u64,     // updated_at
        bool,    // is_verified
        u64      // payment_count
    ) {
        (
            user_profile.sui_address,
            user_profile.face_hash,
            user_profile.walrus_blob_id,
            user_profile.preferred_token,
            user_profile.display_name,
            user_profile.created_at,
            user_profile.updated_at,
            user_profile.is_verified,
            user_profile.payment_count
        )
    }

    /// Get registry statistics
    public fun get_registry_stats(registry: &UserRegistry): u64 {
        registry.user_count
    }

    /// Get user's preferred token
    public fun get_preferred_token(user_profile: &UserProfile): address {
        user_profile.preferred_token
    }

    /// Get user's SUI address
    public fun get_sui_address(user_profile: &UserProfile): address {
        user_profile.sui_address
    }

    /// Check if user is verified
    public fun is_verified(user_profile: &UserProfile): bool {
        user_profile.is_verified
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(REGISTRY {}, ctx);
    }
} 