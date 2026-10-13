-- Migration 002: Subscriptions, Orders, and Pricing for TestHub Monetization

-- 1. Add price_idr to tests (0 = free public test)
ALTER TABLE tests ADD COLUMN IF NOT EXISTS price_idr NUMERIC(12,2) DEFAULT 0;

-- 2. Orders table for tracking Payment Gateway transactions (Midtrans / Xendit)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    test_id VARCHAR(64) REFERENCES tests(id) ON DELETE SET NULL,
    plan_type VARCHAR(32) NOT NULL DEFAULT 'per_test', -- 'per_test', 'season_pass'
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'settled', 'expired', 'failed'
    payment_method VARCHAR(50) DEFAULT 'qris',
    payment_reference VARCHAR(255),
    snap_token VARCHAR(255),
    qr_payload TEXT,
    settled_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 3. Subscriptions table for access control & admin manual overrides
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    user_identifier VARCHAR(255) NOT NULL, -- user email or session identifier
    test_id VARCHAR(64) REFERENCES tests(id) ON DELETE CASCADE, -- NULL if season pass
    tier VARCHAR(32) NOT NULL DEFAULT 'per_test', -- 'per_test', 'season_pass', 'institution', 'lifetime'
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'expired', 'revoked'
    source VARCHAR(32) NOT NULL DEFAULT 'gateway', -- 'gateway_midtrans', 'gateway_xendit', 'admin_manual'
    admin_notes TEXT, -- audit notes if granted by admin
    amount_paid NUMERIC(12,2) DEFAULT 0,
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_lookup ON subscriptions(user_identifier, test_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
