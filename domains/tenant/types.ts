export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: SubscriptionPlan;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionPlan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
export type TenantStatus = "ACTIVE" | "SUSPENDED" | "TRIAL";
