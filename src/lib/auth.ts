import { AuthResponse, AuthSession, MerchantAccount } from '@/types/auth';

const USERS_STORAGE_KEY = 'punchcard_merchants_db';
const SESSION_STORAGE_KEY = 'punchcard_active_session';

// Pre-seeded demo accounts matching qrmaker-dz
export const DEMO_USER_1: MerchantAccount = {
  id: 'merchant-demo-1',
  email: 'demo1@qrmaker.dz',
  passwordHash: 'password123',
  businessName: 'Agence Digitale Alger (Demo 1)',
  subscriptionStatus: 'active',
  cardLimit: 10,
  createdAt: new Date().toISOString(),
};

export const DEMO_USER_2: MerchantAccount = {
  id: 'merchant-demo-2',
  email: 'demo2@qrmaker.dz',
  passwordHash: 'password123',
  businessName: 'Studio Oran Médias (Demo 2)',
  subscriptionStatus: 'active',
  cardLimit: 10,
  createdAt: new Date().toISOString(),
};

export const DEMO_USER_ALIAS: MerchantAccount = {
  ...DEMO_USER_1,
  id: 'merchant-demo-alias',
  email: 'demo@agence.dz',
  businessName: 'Agence Digitale DZ',
};

export const DEFAULT_MERCHANTS: MerchantAccount[] = [
  DEMO_USER_1,
  DEMO_USER_ALIAS,
  DEMO_USER_2,
];

export function getStoredMerchants(): MerchantAccount[] {
  if (typeof window === 'undefined') return DEFAULT_MERCHANTS;
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_MERCHANTS));
      return DEFAULT_MERCHANTS;
    }
    const parsed = JSON.parse(raw) as MerchantAccount[];
    const hasDemo1 = parsed.some((u) => u.email === 'demo1@qrmaker.dz');
    const hasDemo2 = parsed.some((u) => u.email === 'demo2@qrmaker.dz');
    if (!hasDemo1 || !hasDemo2) {
      const merged = [
        ...parsed.filter((u) => u.email !== 'demo1@qrmaker.dz' && u.email !== 'demo2@qrmaker.dz'),
        DEMO_USER_1,
        DEMO_USER_2,
      ];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch {
    return DEFAULT_MERCHANTS;
  }
}

export function saveMerchants(users: MerchantAccount[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function getCurrentSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setSession(user: MerchantAccount): AuthSession {
  const session: AuthSession = {
    user,
    token: `token_${user.id}_${Date.now()}`,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export function registerMerchant(
  email: string,
  password: string,
  businessName: string
): AuthResponse {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password || !businessName) {
    return { success: false, error: 'All fields are required.' };
  }

  const merchants = getStoredMerchants();
  const existing = merchants.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const newMerchant: MerchantAccount = {
    id: `merchant-${Date.now()}`,
    email: cleanEmail,
    passwordHash: password,
    businessName: businessName.trim(),
    cardLimit: 5,
    subscriptionStatus: 'active',
    createdAt: new Date().toISOString(),
  };

  const updated = [...merchants, newMerchant];
  saveMerchants(updated);
  setSession(newMerchant);

  return { success: true, user: newMerchant };
}

export function loginMerchant(
  email: string,
  password: string
): AuthResponse {
  const cleanEmail = email.trim().toLowerCase();
  const merchants = getStoredMerchants();
  const user = merchants.find(
    (u) => u.email.toLowerCase() === cleanEmail && u.passwordHash === password
  );

  if (!user) {
    return { success: false, error: 'Invalid email or password.' };
  }

  setSession(user);
  return { success: true, user };
}
