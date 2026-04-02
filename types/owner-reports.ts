export type OwnerReportRangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export type OrderSourceChannel =
  | "POS"
  | "UBER_EATS"
  | "DOORDASH"
  | "ONLINE"
  | "SUBSCRIPTION"
  | "MANUAL"
  | "UNKNOWN";

export interface OwnerReportFilters {
  preset: OwnerReportRangePreset;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  storeIds?: string[]; // tenant-level only
  channels?: OrderSourceChannel[];
  comparePrevious: boolean;
}

export interface OwnerSummaryKpi {
  grossRevenueMinor: number;
  orderCount: number;
  averageOrderValueMinor: number;
  completedOrderCount: number;
  cancelledOrderCount: number;
  completedRate: number; // 0-1
  cancelledRate: number; // 0-1
  subscriptionRevenueMinor: number;
  subscriptionOrderCount: number;
  currencyCode: string;
}

export interface OwnerRevenueTrendPoint {
  dateLabel: string; // "Mon 31 Mar"
  dateKey: string;   // "2025-03-31"
  revenueMinor: number;
  orderCount: number;
  completedOrderCount: number;
  cancelledOrderCount: number;
}

export interface OwnerChannelBreakdownItem {
  channel: OrderSourceChannel;
  revenueMinor: number;
  orderCount: number;
  averageOrderValueMinor: number;
  completedRate: number;
  cancelledRate: number;
}

export interface OwnerStoreComparisonItem {
  storeId: string;
  storeName: string;
  revenueMinor: number;
  orderCount: number;
  averageOrderValueMinor: number;
  connectedChannelCount: number;
  activeSubscriptionCount: number;
  cancelledRate: number;
  currencyCode: string;
}

export interface OwnerProductPerformanceItem {
  productId: string;
  productName: string;
  categoryName: string | null;
  quantitySold: number;
  revenueMinor: number;
  orderCount: number;
  soldOutFlag: boolean;
  isSubscriptionEligible: boolean;
}

export interface OwnerCategoryPerformanceItem {
  categoryId: string;
  categoryName: string;
  quantitySold: number;
  revenueMinor: number;
  orderCount: number;
}

export interface OwnerSubscriptionSummary {
  activeSubscriptionCount: number;
  pausedSubscriptionCount: number;
  estimatedUpcoming7dRevenueMinor: number;
  estimatedUpcoming30dRevenueMinor: number;
  subscriptionRevenueMinor: number;
  subscriptionOrderCount: number;
}

export interface OwnerOrderHealthSummary {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  failedOrders: number;
  completedRate: number;
  cancelledRate: number;
  failedRate: number;
}

export interface OwnerSoldOutImpactSummary {
  soldOutProductCount: number;
  soldOutOptionCount: number;
  topSoldOutProducts: Array<{
    productId: string;
    productName: string;
    recentSales: number;
  }>;
}

export type InsightSeverity = "info" | "warning" | "critical" | "positive";

export interface OwnerInsightItem {
  key: string;
  severity: InsightSeverity;
  title: string;
  description: string;
}

export interface TenantOwnerReportsData {
  filters: OwnerReportFilters;
  fromDate: string;
  toDate: string;
  currencyCode: string;
  timezone: string;
  summary: OwnerSummaryKpi;
  comparisonSummary: OwnerSummaryKpi | null;
  revenueTrend: OwnerRevenueTrendPoint[];
  channelBreakdown: OwnerChannelBreakdownItem[];
  storeComparison: OwnerStoreComparisonItem[];
  topProducts: OwnerProductPerformanceItem[];
  subscriptionSummary: OwnerSubscriptionSummary;
  insights: OwnerInsightItem[];
}

export interface StoreOwnerReportsData {
  storeId: string;
  storeName: string;
  filters: OwnerReportFilters;
  fromDate: string;
  toDate: string;
  currencyCode: string;
  timezone: string;
  summary: OwnerSummaryKpi;
  comparisonSummary: OwnerSummaryKpi | null;
  revenueTrend: OwnerRevenueTrendPoint[];
  channelBreakdown: OwnerChannelBreakdownItem[];
  categoryPerformance: OwnerCategoryPerformanceItem[];
  productPerformance: OwnerProductPerformanceItem[];
  subscriptionSummary: OwnerSubscriptionSummary;
  orderHealth: OwnerOrderHealthSummary;
  soldOutImpact: OwnerSoldOutImpactSummary;
  insights: OwnerInsightItem[];
}
