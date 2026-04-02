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

// ─── Store Settings / Hours ───────────────────────────────────────────────────

export interface OwnerStoreSettingsView {
  store: {
    id: string;
    name: string;
    displayName: string;
    phone: string | null;
    email: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    countryCode: string;
    timezone: string;
    currency: string;
  };
  settings: {
    taxRate: number;
    serviceFeeRate: number;
    pickupIntervalMinutes: number;
    defaultPrepTimeMinutes: number;
    logoUrl: string | null;
  } | null;
  operationSettings: {
    storeOpen: boolean;
    holidayMode: boolean;
    pickupIntervalMinutes: number;
    pickupLeadMinutes: number;
    minPrepTimeMinutes: number;
    maxOrdersPerSlot: number;
    allowSameDayOrders: boolean;
    sameDayOrderCutoffMinutesBeforeClose: number;
    autoSelectPickupTime: boolean;
    autoAcceptOrders: boolean;
    autoPrintPos: boolean;
    subscriptionEnabled: boolean;
    subscriptionPauseAllowed: boolean;
    subscriptionSkipAllowed: boolean;
    subscriptionMinimumAmount: number;
    subscriptionDiscountBps: number;
    subscriptionOrderLeadDays: number;
    subscriptionAllowedWeekdaysJson: string | null;
    onlineOrderEnabled: boolean;
    soldOutResetMode: string;
    soldOutResetHourLocal: number;
    defaultAvailabilityMode: string;
  } | null;
  hours: OwnerStoreHoursRow[];
}

export interface OwnerStoreHoursRow {
  id: string | null;
  dayOfWeek: number;
  isOpen: boolean;
  openTimeLocal: string;
  closeTimeLocal: string;
  pickupStartTimeLocal: string | null;
  pickupEndTimeLocal: string | null;
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export interface OwnerStaffRow {
  storeMembershipId: string;
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  tenantMembershipRole: string;
  storeRole: string;
  status: string;
  isPrimaryStoreOwner: boolean;
  invitedAt: string | null;
  lastLoginAt: string | null;
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

export interface OwnerCategoryRow {
  id: string;
  name: string;
  sourceType: string;
  displayOrder: number;
  isActive: boolean;
  isVisibleOnOnlineOrder: boolean;
  isVisibleOnSubscription: boolean;
  imageUrl: string | null;
  onlineImageUrl: string | null;
  subscriptionImageUrl: string | null;
  localUiColor: string | null;
  productCount: number;
}

export interface OwnerProductRow {
  id: string;
  name: string;
  sourceType: string;
  onlineName: string | null;
  subscriptionName: string | null;
  shortDescription: string | null;
  basePriceAmount: number;
  currency: string;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  isSoldOut: boolean;
  isVisibleOnOnlineOrder: boolean;
  isVisibleOnSubscription: boolean;
  internalNote: string | null;
  categories: string[];
}

export interface OwnerModifierGroupRow {
  id: string;
  name: string;
  sourceType: string;
  displayOrder: number;
  isActive: boolean;
  isVisibleOnOnlineOrder: boolean;
  options: OwnerModifierOptionRow[];
}

export interface OwnerModifierOptionRow {
  id: string;
  name: string;
  sourceType: string;
  priceDeltaAmount: number;
  displayOrder: number;
  isDefault: boolean;
  isSoldOut: boolean;
  isActive: boolean;
}

// ─── Integrations ─────────────────────────────────────────────────────────────

export interface OwnerConnectionCard {
  provider: string;
  connectionType: string;
  label: string;
  status: string;
  authScheme: string | null;
  externalStoreName: string | null;
  externalMerchantId: string | null;
  lastConnectedAt: string | null;
  lastAuthValidatedAt: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  reauthRequired: boolean;
  lastErrorMessage: string | null;
}

// ─── Dashboard (store-context) ────────────────────────────────────────────────

export interface OwnerStoreDashboard {
  storeId: string;
  storeName: string;
  todaySalesMinorUnit: number;
  todayOrderCount: number;
  completedOrderCount: number;
  cancelledOrderCount: number;
  soldOutProductCount: number;
  activeSubscriptionCount: number;
  connectedChannelCount: number;
  totalChannelCount: number;
  channelBreakdown: OwnerChannelBreakdown[];
  recentOrders: OwnerRecentOrderRow[];
  soldOutProducts: OwnerSoldOutProductRow[];
  upcomingSubscriptionOrderCount: number;
}

export interface OwnerChannelBreakdown {
  channel: string;
  todayRevenueMinorUnit: number;
  todayOrderCount: number;
}

export interface OwnerRecentOrderRow {
  id: string;
  channel: string;
  status: string;
  totalAmountMinorUnit: number;
  currency: string;
  createdAt: string;
  customerName: string | null;
}

export interface OwnerSoldOutProductRow {
  id: string;
  name: string;
  onlineName: string | null;
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export interface OwnerSubscriptionSummary {
  activeCount: number;
  pausedCount: number;
  next7DaysExpectedOrderCount: number;
  next30DaysExpectedRevenueMajorUnit: number;
  subscriptionEnabledProductCount: number;
}

export interface OwnerSubscriptionCustomerRow {
  customerId: string;
  name: string | null;
  email: string | null;
  activeSubscriptionCount: number;
  pausedSubscriptionCount: number;
  nextOrderDate: string | null;
  totalMonthlyAmountMinorUnit: number;
}

export interface OwnerUpcomingSubscriptionRow {
  subscriptionId: string;
  customerId: string;
  customerName: string | null;
  nextBillingDate: string;
  planName: string;
  expectedAmountMinorUnit: number;
  status: string;
}

// ─── Phase 5: Customer & Subscription Management ─────────────────────────────

export interface OwnerCustomerRow {
  id: string; // = Order.customerId (the stable string identifier)
  name: string | null;
  email: string | null;
  phone: string | null;
  primaryStoreName: string | null;
  totalOrders: number;
  lifetimeRevenueMinorUnit: number;
  activeSubscriptionCount: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  recent30dOrderCount: number;
  joinedAt: string | null; // first order date as proxy
}

export interface OwnerCustomerListResult {
  customers: OwnerCustomerRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OwnerCustomerKpi {
  totalCustomers: number;
  customersWithActiveSubscriptions: number;
  customersOrderedLast30Days: number;
  totalActiveSubscriptions: number;
}

export interface OwnerCustomerDetail {
  id: string; // = Order.customerId
  name: string | null;
  email: string | null;
  phone: string | null;
  internalNote: string | null;
  noteUpdatedAt: string | null;
  // KPIs
  totalOrders: number;
  lifetimeRevenueMinorUnit: number;
  activeSubscriptionCount: number;
  pausedSubscriptionCount: number;
  cancelledSubscriptionCount: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  recent30dOrderCount: number;
  recent90dRevenueMinorUnit: number;
  // Breakdowns
  storeBreakdown: OwnerCustomerStoreBreakdown[];
  channelBreakdown: OwnerCustomerChannelBreakdown[];
}

export interface OwnerCustomerStoreBreakdown {
  storeId: string;
  storeName: string;
  orderCount: number;
  revenueMinorUnit: number;
}

export interface OwnerCustomerChannelBreakdown {
  channel: string;
  orderCount: number;
  revenueMinorUnit: number;
}

export interface OwnerCustomerOrderRow {
  id: string;
  storeId: string;
  storeName: string;
  sourceChannel: string;
  status: string;
  totalAmountMinorUnit: number;
  currencyCode: string;
  orderedAt: string;
  createdAt: string;
}

export interface OwnerCustomerSubscriptionRow {
  id: string;
  planId: string;
  planName: string;
  storeId: string;
  storeName: string;
  interval: string;
  status: string;
  startDate: string;
  nextBillingDate: string;
  nextOrderAt: string | null;
  cancelledAt: string | null;
  pausedAt: string | null;
  cancelReason: string | null;
  internalNote: string | null;
  updatedAt: string;
}

export interface OwnerSubscriptionActionResult {
  success: boolean;
  subscriptionId: string;
  newStatus: string;
}
