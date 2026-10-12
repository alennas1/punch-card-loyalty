-- =========================================================================
-- Neon Serverless PostgreSQL Schema for Digital Punch Card Platform
-- Run this in the Neon Console (SQL Editor) to initialize your cloud tables.
-- =========================================================================

-- Enable pgcrypto / uuid-ossp if gen_random_uuid is not built-in (default in Postgres 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Shops (Merchants)
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    brand_color VARCHAR(16) DEFAULT '#D97706',
    logo_url TEXT,
    target_stamps INT NOT NULL DEFAULT 10,
    reward_description VARCHAR(255) NOT NULL,
    cashier_pin_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);

-- 2. Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    phone_number VARCHAR(32) NOT NULL,
    stamp_balance INT NOT NULL DEFAULT 0,
    lifetime_rewards_claimed INT NOT NULL DEFAULT 0,
    last_visit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shop_customer UNIQUE (shop_id, phone_number),
    CONSTRAINT chk_stamp_balance_positive CHECK (stamp_balance >= 0)
);

CREATE INDEX IF NOT EXISTS idx_customers_shop_phone ON customers(shop_id, phone_number);

-- 3. Transactions (Audit Trail)
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('STAMP_ADDED', 'REWARD_CLAIMED', 'MANUAL_ADJUST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    action_type transaction_type NOT NULL,
    stamps_delta INT NOT NULL,
    resulting_balance INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_shop ON transactions(shop_id, created_at DESC);

-- =========================================================================
-- Initial Seed: Demo Shop 'cafe-central' (PIN: 1234)
-- =========================================================================
-- Note: The hash for '1234' with pepper 'punch_card_pepper_secret_salt' is:
-- 3df43fcf305d233e144a673076156e9cff58dff84cf3a56cf9e38e83348633cb
INSERT INTO shops (slug, name, brand_color, logo_url, target_stamps, reward_description, cashier_pin_hash)
VALUES (
    'cafe-central',
    'Café Central',
    '#D97706',
    NULL,
    10,
    '1 Free Artisan Cappuccino',
    '3df43fcf305d233e144a673076156e9cff58dff84cf3a56cf9e38e83348633cb'
)
ON CONFLICT (slug) DO NOTHING;
