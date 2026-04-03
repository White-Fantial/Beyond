// Owner Console Phase 9 — Advanced Analytics & Forecasting type definitions

// ─── Heatmap ──────────────────────────────────────────────────────────────────

/**
 * A single cell in the weekday × hour-slot heatmap.
 * weekday: 0 = Sunday … 6 = Saturday (matches JS Date.getDay())
 * hour: 0–23
 */
export interface HeatmapCell {
  weekday: number;
  hour: number;
  orderCount: number;
}

export interface HeatmapData {
  cells: HeatmapCell[];
  /** Maximum orderCount across all cells — useful for normalising colour scale. */
  maxCount: number;
  peakWeekday: number; // 0–6
  peakHour: number; // 0–23
  totalOrders: number;
}

// ─── Revenue Forecast ─────────────────────────────────────────────────────────

export interface ForecastPoint {
  date: string; // ISO date YYYY-MM-DD
  /** Predicted revenue in minor currency units (e.g. cents). */
  predicted: number;
  /** Lower bound of the 80% confidence interval. */
  lower: number;
  /** Upper bound of the 80% confidence interval. */
  upper: number;
  /** Actual revenue on this date if it is in the past (otherwise null). */
  actual: number | null;
}

export type ForecastHorizon = 7 | 14 | 30;

export interface ForecastData {
  points: ForecastPoint[];
  horizon: ForecastHorizon;
  /** Projected total revenue for the forecast window (minor units). */
  projectedTotalMinor: number;
  currencyCode: string;
}

// ─── Production Estimates ─────────────────────────────────────────────────────

export interface ProductionDayEstimate {
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Short weekday label, e.g. "Mon" */
  dayLabel: string;
  /** Estimated order count for this day. */
  estimated: number;
  /** Same weekday estimated from the prior 4-week window. */
  priorWeekEstimate: number;
  /** Positive = higher than prior week; negative = lower. */
  delta: number;
}

export interface StoreProductionEstimate {
  storeId: string;
  storeName: string;
  days: ProductionDayEstimate[];
  /** Total estimated orders for the target week. */
  weekTotal: number;
}

export interface ProductionEstimatesData {
  stores: StoreProductionEstimate[];
  /** ISO date of the Monday of the target week. */
  weekStartDate: string;
}

// ─── Churn Risk ───────────────────────────────────────────────────────────────

export type ChurnRiskLevel = "HIGH" | "MEDIUM" | "LOW";

export interface ChurnRiskCustomer {
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  /** Total orders in the full recency window. */
  totalOrders: number;
  /** Orders in the more-recent half of the recency window. */
  recentOrders: number;
  /** Orders in the older half of the recency window. */
  priorOrders: number;
  /** ISO 8601 datetime of the most recent order. */
  lastOrderAt: string | null;
  /** Number of days since the most recent order. */
  daysSinceLastOrder: number | null;
  riskLevel: ChurnRiskLevel;
  /** Active subscription count for this customer. */
  activeSubscriptions: number;
}

export interface ChurnRiskData {
  customers: ChurnRiskCustomer[];
  totalAtRisk: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}

// ─── Shared filter types ──────────────────────────────────────────────────────

export interface OwnerAnalyticsFilters {
  storeId?: string;
  storeIds?: string[];
  from?: string; // ISO date YYYY-MM-DD
  to?: string; // ISO date YYYY-MM-DD
  horizon?: ForecastHorizon;
  /** ISO date of the Monday of the target week (production estimates). */
  weekStartDate?: string;
  granularity?: "week" | "month";
}
