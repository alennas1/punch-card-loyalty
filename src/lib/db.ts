import { neon } from '@neondatabase/serverless';
import { Customer, Shop, TransactionRecord } from '@/types/loyalty';
import { hashPin } from './crypto';

// In-memory fallback store for local development when DATABASE_URL is not set
class MockDatabase {
  private shops: Map<string, Shop> = new Map();
  private customers: Map<string, Customer> = new Map();
  private transactions: TransactionRecord[] = [];

  constructor() {
    // Seed initial demo shop 'cafe-central' with default PIN '1234'
    const defaultShopId = '00000000-0000-0000-0000-000000000001';
    this.shops.set('cafe-central', {
      id: defaultShopId,
      slug: 'cafe-central',
      name: 'Café Central',
      brandColor: '#D97706', // Warm Amber
      logoUrl: null,
      targetStamps: 10,
      rewardDescription: '1 Free Artisan Cappuccino',
      cashierPinHash: hashPin('1234'),
      createdAt: new Date().toISOString(),
    });

    // Seed a second shop 'gelato-paradiso' for multi-tenant verification
    const gelatoShopId = '00000000-0000-0000-0000-000000000002';
    this.shops.set('gelato-paradiso', {
      id: gelatoShopId,
      slug: 'gelato-paradiso',
      name: 'Gelato Paradiso',
      brandColor: '#EC4899', // Rich Pink
      logoUrl: null,
      targetStamps: 8,
      rewardDescription: '2 Free Waffle Scoops',
      cashierPinHash: hashPin('5678'),
      createdAt: new Date().toISOString(),
    });
  }

  getShopBySlug(slug: string): Shop | null {
    return this.shops.get(slug.toLowerCase()) || null;
  }

  getCustomer(shopId: string, phoneNumber: string): Customer | null {
    const key = `${shopId}:${phoneNumber}`;
    return this.customers.get(key) || null;
  }

  getOrCreateCustomer(shopId: string, phoneNumber: string): Customer {
    const key = `${shopId}:${phoneNumber}`;
    const existing = this.customers.get(key);
    if (existing) {
      return existing;
    }

    const newCustomer: Customer = {
      id: crypto.randomUUID(),
      shopId,
      phoneNumber,
      stampBalance: 0,
      lifetimeRewardsClaimed: 0,
      lastVisitAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.customers.set(key, newCustomer);
    return newCustomer;
  }

  addStamp(shopId: string, phoneNumber: string): { customer: Customer; transaction: TransactionRecord } {
    const customer = this.getOrCreateCustomer(shopId, phoneNumber);
    customer.stampBalance += 1;
    customer.lastVisitAt = new Date().toISOString();

    const transaction: TransactionRecord = {
      id: crypto.randomUUID(),
      shopId,
      customerId: customer.id,
      actionType: 'STAMP_ADDED',
      stampsDelta: 1,
      resultingBalance: customer.stampBalance,
      createdAt: new Date().toISOString(),
    };
    this.transactions.push(transaction);

    return { customer, transaction };
  }

  redeemReward(shopId: string, phoneNumber: string): { customer: Customer; transaction: TransactionRecord } {
    const customer = this.getOrCreateCustomer(shopId, phoneNumber);
    customer.stampBalance = 0;
    customer.lifetimeRewardsClaimed += 1;
    customer.lastVisitAt = new Date().toISOString();

    const transaction: TransactionRecord = {
      id: crypto.randomUUID(),
      shopId,
      customerId: customer.id,
      actionType: 'REWARD_CLAIMED',
      stampsDelta: 0,
      resultingBalance: 0,
      createdAt: new Date().toISOString(),
    };
    this.transactions.push(transaction);

    return { customer, transaction };
  }

  getRecentTransactions(shopId: string, limit = 5): Array<TransactionRecord & { phoneNumber: string }> {
    return this.transactions
      .filter((t) => t.shopId === shopId)
      .slice(-limit)
      .reverse()
      .map((t) => {
        let phone = 'Unknown';
        for (const cust of this.customers.values()) {
          if (cust.id === t.customerId) {
            phone = cust.phoneNumber;
            break;
          }
        }
        return {
          ...t,
          phoneNumber: phone,
        };
      });
  }
}

// Single instance of mock db in module scope
const mockDb = new MockDatabase();

/**
 * Access layer supporting both live Neon PostgreSQL connections and offline fallback.
 */
export async function getShopBySlug(slug: string): Promise<Shop | null> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return mockDb.getShopBySlug(slug);
  }

  const sql = neon(dbUrl);
  const rows = await sql`
    SELECT id, slug, name, brand_color AS "brandColor", logo_url AS "logoUrl",
           target_stamps AS "targetStamps", reward_description AS "rewardDescription",
           cashier_pin_hash AS "cashierPinHash", created_at AS "createdAt"
    FROM shops
    WHERE slug = ${slug.toLowerCase()}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return null;
  return rows[0] as unknown as Shop;
}

export async function getCustomer(shopId: string, phoneNumber: string): Promise<Customer | null> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return mockDb.getCustomer(shopId, phoneNumber);
  }

  const sql = neon(dbUrl);
  const rows = await sql`
    SELECT id, shop_id AS "shopId", phone_number AS "phoneNumber",
           stamp_balance AS "stampBalance", lifetime_rewards_claimed AS "lifetimeRewardsClaimed",
           last_visit_at AS "lastVisitAt", created_at AS "createdAt"
    FROM customers
    WHERE shop_id = ${shopId} AND phone_number = ${phoneNumber}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return null;
  return rows[0] as unknown as Customer;
}

export async function getOrCreateCustomer(shopId: string, phoneNumber: string): Promise<Customer> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return mockDb.getOrCreateCustomer(shopId, phoneNumber);
  }

  const sql = neon(dbUrl);
  const rows = await sql`
    INSERT INTO customers (shop_id, phone_number, stamp_balance, lifetime_rewards_claimed, last_visit_at)
    VALUES (${shopId}, ${phoneNumber}, 0, 0, NOW())
    ON CONFLICT (shop_id, phone_number)
    DO UPDATE SET last_visit_at = NOW()
    RETURNING id, shop_id AS "shopId", phone_number AS "phoneNumber",
              stamp_balance AS "stampBalance", lifetime_rewards_claimed AS "lifetimeRewardsClaimed",
              last_visit_at AS "lastVisitAt", created_at AS "createdAt"
  `;
  return rows[0] as unknown as Customer;
}

export async function addStamp(shopId: string, phoneNumber: string): Promise<{ customer: Customer; transaction: TransactionRecord }> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return mockDb.addStamp(shopId, phoneNumber);
  }

  const sql = neon(dbUrl);
  const updatedCustRows = await sql`
    INSERT INTO customers (shop_id, phone_number, stamp_balance, lifetime_rewards_claimed, last_visit_at)
    VALUES (${shopId}, ${phoneNumber}, 1, 0, NOW())
    ON CONFLICT (shop_id, phone_number)
    DO UPDATE SET stamp_balance = customers.stamp_balance + 1, last_visit_at = NOW()
    RETURNING id, shop_id AS "shopId", phone_number AS "phoneNumber",
              stamp_balance AS "stampBalance", lifetime_rewards_claimed AS "lifetimeRewardsClaimed",
              last_visit_at AS "lastVisitAt", created_at AS "createdAt"
  `;
  const customer = updatedCustRows[0] as unknown as Customer;

  const txRows = await sql`
    INSERT INTO transactions (shop_id, customer_id, action_type, stamps_delta, resulting_balance)
    VALUES (${shopId}, ${customer.id}, 'STAMP_ADDED', 1, ${customer.stampBalance})
    RETURNING id, shop_id AS "shopId", customer_id AS "customerId", action_type AS "actionType",
              stamps_delta AS "stampsDelta", resulting_balance AS "resultingBalance", created_at AS "createdAt"
  `;
  const transaction = txRows[0] as unknown as TransactionRecord;

  return { customer, transaction };
}

export async function redeemReward(shopId: string, phoneNumber: string): Promise<{ customer: Customer; transaction: TransactionRecord }> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return mockDb.redeemReward(shopId, phoneNumber);
  }

  const sql = neon(dbUrl);
  const updatedCustRows = await sql`
    UPDATE customers
    SET stamp_balance = 0,
        lifetime_rewards_claimed = lifetime_rewards_claimed + 1,
        last_visit_at = NOW()
    WHERE shop_id = ${shopId} AND phone_number = ${phoneNumber}
    RETURNING id, shop_id AS "shopId", phone_number AS "phoneNumber",
              stamp_balance AS "stampBalance", lifetime_rewards_claimed AS "lifetimeRewardsClaimed",
              last_visit_at AS "lastVisitAt", created_at AS "createdAt"
  `;
  const customer = updatedCustRows[0] as unknown as Customer;

  const txRows = await sql`
    INSERT INTO transactions (shop_id, customer_id, action_type, stamps_delta, resulting_balance)
    VALUES (${shopId}, ${customer.id}, 'REWARD_CLAIMED', 0, 0)
    RETURNING id, shop_id AS "shopId", customer_id AS "customerId", action_type AS "actionType",
              stamps_delta AS "stampsDelta", resulting_balance AS "resultingBalance", created_at AS "createdAt"
  `;
  const transaction = txRows[0] as unknown as TransactionRecord;

  return { customer, transaction };
}

export async function getRecentTransactions(shopId: string, limit = 5): Promise<Array<TransactionRecord & { phoneNumber: string }>> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return mockDb.getRecentTransactions(shopId, limit);
  }

  const sql = neon(dbUrl);
  const rows = await sql`
    SELECT t.id, t.shop_id AS "shopId", t.customer_id AS "customerId",
           t.action_type AS "actionType", t.stamps_delta AS "stampsDelta",
           t.resulting_balance AS "resultingBalance", t.created_at AS "createdAt",
           c.phone_number AS "phoneNumber"
    FROM transactions t
    JOIN customers c ON t.customer_id = c.id
    WHERE t.shop_id = ${shopId}
    ORDER BY t.created_at DESC
    LIMIT ${limit}
  `;
  return rows as unknown as Array<TransactionRecord & { phoneNumber: string }>;
}
