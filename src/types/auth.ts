export interface MerchantAccount {
  id: string;
  email: string;
  passwordHash: string;
  businessName: string;
  cardLimit: number;
  subscriptionStatus: 'active' | 'trial' | 'expired';
  createdAt: string;
}

export interface AuthSession {
  user: MerchantAccount;
  token: string;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: MerchantAccount;
}
