// Owner portal type definitions

export interface OwnerDashboardSummary {
  todaySales: number;
  thisWeekSales: number;
  ordersToday: number;
  soldOutItemsCount: number;
  posConnectionStatus: "CONNECTED" | "ERROR" | "NOT_CONNECTED";
  deliveryConnectionStatus: "CONNECTED" | "ERROR" | "NOT_CONNECTED";
  paymentConnectionStatus: "CONNECTED" | "ERROR" | "NOT_CONNECTED";
  recentLogs: OwnerRecentLog[];
}

export interface OwnerRecentLog {
  id: string;
  message: string;
  level: "INFO" | "WARN" | "ERROR";
  occurredAt: string;
}

export interface OwnerStoreInfo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  timezone: string;
  currency: string;
  taxRate: number;
  serviceFeeRate: number;
  pickupIntervalMinutes: number;
  defaultPrepTimeMinutes: number;
  logoUrl: string | null;
}

export interface OwnerUserRow {
  storeMembershipId: string;
  userId: string;
  name: string;
  email: string;
  storeRole: string;
  membershipRole: string;
  status: string;
  joinedAt: string;
  storeName: string;
}

export interface OwnerConnectionRow {
  id: string;
  name: string;
  provider: string;
  type: string;
  status: string;
  expiresAt: string | null;
  lastSync: string | null;
  storeName: string;
}

export interface OwnerCatalogSettings {
  id: string | null;
  storeId: string;
  storeName: string;
  sourceConnectionId: string | null;
  sourceType: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
}

export interface OwnerOperationSettings {
  id: string | null;
  storeId: string;
  storeName: string;
  storeOpen: boolean;
  holidayMode: boolean;
  pickupIntervalMinutes: number;
  minPrepTimeMinutes: number;
  maxOrdersPerSlot: number;
  autoAcceptOrders: boolean;
  autoPrintPos: boolean;
  subscriptionEnabled: boolean;
  onlineOrderEnabled: boolean;
}
