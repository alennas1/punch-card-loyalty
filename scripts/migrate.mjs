import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Read DATABASE_URL from .env.local
const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
const match = envContent.match(/DATABASE_URL=(.+)/);
if (!match) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}
const dbUrl = match[1].trim();

console.log('Connecting to Neon Cloud PostgreSQL...');
const sql = neon(dbUrl);

async function runMigration() {
  try {
    console.log('Applying schema migrations to Neon...');

    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;

    await sql`
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
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);`;

    await sql`
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
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_customers_shop_phone ON customers(shop_id, phone_number);`;

    await sql`
      DO $$ BEGIN
        CREATE TYPE transaction_type AS ENUM ('STAMP_ADDED', 'REWARD_CLAIMED', 'MANUAL_ADJUST');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        action_type transaction_type NOT NULL,
        stamps_delta INT NOT NULL,
        resulting_balance INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id, created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_shop ON transactions(shop_id, created_at DESC);`;

    console.log('Seeding initial merchants into Neon...');

    // Seed Café Central (PIN: 1234)
    const { createHash } = await import('node:crypto');
    const pepper = 'punch_card_pepper_secret_salt';
    const cafePinHash = createHash('sha256').update(`${pepper}:1234`).digest('hex');
    await sql`
      INSERT INTO shops (slug, name, brand_color, logo_url, target_stamps, reward_description, cashier_pin_hash)
      VALUES (
        'cafe-central',
        'Café Central',
        '#D97706',
        NULL,
        10,
        '1 Free Artisan Cappuccino',
        ${cafePinHash}
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        brand_color = EXCLUDED.brand_color,
        target_stamps = EXCLUDED.target_stamps,
        reward_description = EXCLUDED.reward_description,
        cashier_pin_hash = EXCLUDED.cashier_pin_hash;
    `;

    // Seed Gelato Paradiso (PIN: 5678)
    const gelatoPinHash = createHash('sha256').update(`${pepper}:5678`).digest('hex');
    await sql`
      INSERT INTO shops (slug, name, brand_color, logo_url, target_stamps, reward_description, cashier_pin_hash)
      VALUES (
        'gelato-paradiso',
        'Gelato Paradiso',
        '#EC4899',
        NULL,
        8,
        '2 Free Waffle Scoops',
        ${gelatoPinHash}
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        brand_color = EXCLUDED.brand_color,
        target_stamps = EXCLUDED.target_stamps,
        reward_description = EXCLUDED.reward_description,
        cashier_pin_hash = EXCLUDED.cashier_pin_hash;
    `;

    const shops = await sql`SELECT slug, name, target_stamps, reward_description FROM shops;`;
    console.log('Neon Database migration completed successfully!');
    console.log('Live Shops in Neon:', shops);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
