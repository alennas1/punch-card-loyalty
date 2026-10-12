export type TransactionActionType = 'STAMP_ADDED' | 'REWARD_CLAIMED' | 'MANUAL_ADJUST';

export interface Shop {
  id: string;
  slug: string;
  name: string;
  brandColor: string;
  logoUrl: string | null;
  targetStamps: number;
  rewardDescription: string;
  cashierPinHash: string;
  createdAt: string;
}

export interface ShopPublicConfig {
  slug: string;
  name: string;
  brandColor: string;
  logoUrl: string | null;
  targetStamps: number;
  rewardDescription: string;
}

export interface Customer {
  id: string;
  shopId: string;
  phoneNumber: string;
  stampBalance: number;
  lifetimeRewardsClaimed: number;
  lastVisitAt: string;
  createdAt: string;
}

export interface CustomerCardState {
  phoneNumber: string;
  stampBalance: number;
  targetStamps: number;
  lifetimeRewardsClaimed: number;
  isRewardUnlocked: boolean;
  rewardDescription: string;
  lastVisitAt: string;
}

export interface TransactionRecord {
  id: string;
  shopId: string;
  customerId: string;
  actionType: TransactionActionType;
  stampsDelta: number;
  resultingBalance: number;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: 'NOT_FOUND' | 'INVALID_PIN' | 'INVALID_PHONE' | 'LIMIT_EXCEEDED' | 'SERVER_ERROR' | 'UNAUTHORIZED';
    message: string;
  };
}

export interface CashierAuthRequest {
  slug: string;
  pin: string;
}

export interface StampActionRequest {
  slug: string;
  pin: string;
  phoneNumber: string;
}

export interface RedeemActionRequest {
  slug: string;
  pin: string;
  phoneNumber: string;
}
