import type { ReferralCode } from "./customer-loyalty";

export interface ReferralHistoryEntry {
  id: string;
  pointsDelta: number;
  description: string | null;
  createdAt: string;
}

export interface ReferralStats {
  code: ReferralCode;
  totalReferrals: number;
  pointsEarned: number;
  referralHistory: ReferralHistoryEntry[];
}

export interface PushPreferences {
  orders: boolean;
  promotions: boolean;
  loyalty: boolean;
}
