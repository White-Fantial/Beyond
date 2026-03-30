export interface Subscription {
  id: string;
  storeId: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: Date;
  nextBillingDate: Date;
  cancelledAt?: Date;
  createdAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  storeId: string;
  name: string;
  price: number;
  interval: BillingInterval;
  benefits: string[];
  isActive: boolean;
}

export type SubscriptionStatus = "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED";
export type BillingInterval = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
