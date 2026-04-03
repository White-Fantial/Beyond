// Backoffice Phase 1 — Live Dashboard & Operational Reports type definitions

// ─── Shared ───────────────────────────────────────────────────────────────────

export type BackofficeOrderChannel =
  | "POS"
  | "UBER_EATS"
  | "DOORDASH"
  | "ONLINE"
  | "SUBSCRIPTION"
  | "MANUAL"
  | "UNKNOWN";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface BackofficeChannelCount {
  channel: BackofficeOrderChannel;
  orderCount: number;
}

export interface BackofficeActiveOrder {
  id: string;
  status: string;
  sourceChannel: BackofficeOrderChannel;
  /** ISO 8601 datetime */
  orderedAt: string;
  /** Minutes elapsed since orderedAt (at time of fetch). */
  ageMinutes: number;
  customerName: string | null;
  totalAmount: number;
  currencyCode: string;
}

export interface BackofficeDashboardData {
  /** Today's orders regardless of status. */
  todayOrderCount: number;
  /** Today's completed-order revenue in minor units (e.g. cents). */
  todayRevenueMinor: number;
  /** Count of orders in RECEIVED / ACCEPTED / IN_PROGRESS / READY states. */
  activeOrderCount: number;
  /** Count of CatalogProducts where isSoldOut = true for this store. */
  soldOutItemCount: number;
  /** Order count per channel for today. */
  channelBreakdown: BackofficeChannelCount[];
  /** In-flight orders (up to 20), sorted oldest first for urgency. */
  activeOrders: BackofficeActiveOrder[];
  currencyCode: string;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface BackofficeDailyPoint {
  /** YYYY-MM-DD */
  dateKey: string;
  /** Short label e.g. "Mon 31 Mar" */
  dateLabel: string;
  orderCount: number;
  /** Revenue in minor units. */
  revenueMinor: number;
}

export interface BackofficeChannelReportItem {
  channel: BackofficeOrderChannel;
  orderCount: number;
  revenueMinor: number;
}

export interface BackofficeStatusFunnelItem {
  status: string;
  count: number;
}

export interface BackofficeTopProduct {
  productName: string;
  /** Total line items across all orders. */
  lineCount: number;
  /** Total quantity sold. */
  quantitySold: number;
}

/**
 * A single cell in the 7-day × 24-hour peak-hour grid.
 * weekday: 0 = Sunday … 6 = Saturday
 */
export interface BackofficePeakHourCell {
  weekday: number;
  hour: number;
  orderCount: number;
}

export interface BackofficeReportData {
  /** Number of days this report covers (7, 14, or 30). */
  days: number;
  /** ISO date of the start of the period. */
  fromDate: string;
  /** ISO date of the end of the period. */
  toDate: string;
  currencyCode: string;
  /** One entry per day in the period. */
  dailySeries: BackofficeDailyPoint[];
  /** Orders and revenue broken down by channel. */
  channelBreakdown: BackofficeChannelReportItem[];
  /** Order counts at each status stage (funnel). */
  statusFunnel: BackofficeStatusFunnelItem[];
  /** Top 5 products by order-line frequency. */
  topProducts: BackofficeTopProduct[];
  /** 7 × 24 heatmap cells. maxCount is used to normalise colour scale. */
  peakHourCells: BackofficePeakHourCell[];
  peakHourMax: number;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface BackofficeDashboardResponse {
  data: BackofficeDashboardData;
}

export interface BackofficeReportsResponse {
  data: BackofficeReportData;
}
