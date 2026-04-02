/**
 * Owner Reports Service — orchestrates full report payloads.
 *
 * Uses owner-report-query.service for data and owner-report-insight.service for insights.
 */

import { prisma } from "@/lib/prisma";
import type {
  OwnerReportFilters,
  TenantOwnerReportsData,
  StoreOwnerReportsData,
  OwnerSummaryKpi,
} from "@/types/owner-reports";
import {
  resolvePresetRange,
  resolveComparePeriod,
  formatDateKey,
} from "@/lib/owner/reports/filters";
import {
  querySummaryKpi,
  queryRevenueTrend,
  queryChannelBreakdown,
  queryStoreComparison,
  queryTopProducts,
  queryCategoryPerformance,
  querySubscriptionSummary,
  queryOrderHealth,
  querySoldOutImpact,
  type QueryInput,
} from "./owner-report-query.service";
import {
  deriveTenantInsights,
  deriveStoreInsights,
} from "./owner-report-insight.service";

// ─── Input types ──────────────────────────────────────────────────────────────

export interface GetTenantOwnerReportsInput {
  tenantId: string;
  filters: OwnerReportFilters;
}

export interface GetStoreOwnerReportsInput {
  tenantId: string;
  storeId: string;
  filters: OwnerReportFilters;
}

// ─── Tenant-level reports ─────────────────────────────────────────────────────

export async function getTenantOwnerReports(
  input: GetTenantOwnerReportsInput
): Promise<TenantOwnerReportsData> {
  const { tenantId, filters } = input;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true, currency: true },
  });
  const timezone = tenant?.timezone ?? "Pacific/Auckland";
  const currencyCode = tenant?.currency ?? "NZD";

  const { from, to } = resolvePresetRange(filters.preset, timezone, filters.from, filters.to);

  const queryInput: QueryInput = {
    tenantId,
    storeIds: filters.storeIds?.length ? filters.storeIds : undefined,
    from,
    to,
    channels: filters.channels?.length ? filters.channels : undefined,
    currencyCode,
    timezone,
  };

  const [summary, revenueTrend, channelBreakdown, storeComparison, topProducts, subscriptionSummary] =
    await Promise.all([
      querySummaryKpi(queryInput),
      queryRevenueTrend(queryInput),
      queryChannelBreakdown(queryInput),
      queryStoreComparison(queryInput),
      queryTopProducts(queryInput),
      querySubscriptionSummary(queryInput),
    ]);

  let comparisonSummary: OwnerSummaryKpi | null = null;
  if (filters.comparePrevious) {
    const { from: cFrom, to: cTo } = resolveComparePeriod(from, to);
    comparisonSummary = await querySummaryKpi({ ...queryInput, from: cFrom, to: cTo });
  }

  const partial: Omit<TenantOwnerReportsData, "insights"> = {
    filters,
    fromDate: formatDateKey(from, timezone),
    toDate: formatDateKey(to, timezone),
    currencyCode,
    timezone,
    summary,
    comparisonSummary,
    revenueTrend,
    channelBreakdown,
    storeComparison,
    topProducts,
    subscriptionSummary,
  };

  const insights = deriveTenantInsights(partial);

  return { ...partial, insights };
}

// ─── Store-level reports ──────────────────────────────────────────────────────

export async function getStoreOwnerReports(
  input: GetStoreOwnerReportsInput
): Promise<StoreOwnerReportsData> {
  const { tenantId, storeId, filters } = input;

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { name: true, timezone: true, currency: true },
  });
  const timezone = store?.timezone ?? "Pacific/Auckland";
  const currencyCode = store?.currency ?? "NZD";
  const storeName = store?.name ?? storeId;

  const { from, to } = resolvePresetRange(filters.preset, timezone, filters.from, filters.to);

  const queryInput: QueryInput = {
    tenantId,
    storeId,
    from,
    to,
    channels: filters.channels?.length ? filters.channels : undefined,
    currencyCode,
    timezone,
  };

  const [summary, revenueTrend, channelBreakdown, categoryPerformance, productPerformance, subscriptionSummary, orderHealth, soldOutImpact] =
    await Promise.all([
      querySummaryKpi(queryInput),
      queryRevenueTrend(queryInput),
      queryChannelBreakdown(queryInput),
      queryCategoryPerformance(queryInput),
      queryTopProducts(queryInput),
      querySubscriptionSummary(queryInput),
      queryOrderHealth(queryInput),
      querySoldOutImpact(queryInput),
    ]);

  let comparisonSummary: OwnerSummaryKpi | null = null;
  if (filters.comparePrevious) {
    const { from: cFrom, to: cTo } = resolveComparePeriod(from, to);
    comparisonSummary = await querySummaryKpi({ ...queryInput, from: cFrom, to: cTo });
  }

  const partial: Omit<StoreOwnerReportsData, "insights"> = {
    storeId,
    storeName,
    filters,
    fromDate: formatDateKey(from, timezone),
    toDate: formatDateKey(to, timezone),
    currencyCode,
    timezone,
    summary,
    comparisonSummary,
    revenueTrend,
    channelBreakdown,
    categoryPerformance,
    productPerformance,
    subscriptionSummary,
    orderHealth,
    soldOutImpact,
  };

  const insights = deriveStoreInsights(partial);

  return { ...partial, insights };
}

// ─── Individual getters (for API endpoint flexibility) ────────────────────────

export async function getTenantReportSummary(input: GetTenantOwnerReportsInput) {
  const { tenantId, filters } = input;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { timezone: true, currency: true } });
  const timezone = tenant?.timezone ?? "Pacific/Auckland";
  const currencyCode = tenant?.currency ?? "NZD";
  const { from, to } = resolvePresetRange(filters.preset, timezone, filters.from, filters.to);
  return querySummaryKpi({ tenantId, storeIds: filters.storeIds, from, to, channels: filters.channels, currencyCode, timezone });
}

export async function getStoreReportSummary(input: GetStoreOwnerReportsInput) {
  const { tenantId, storeId, filters } = input;
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { timezone: true, currency: true } });
  const timezone = store?.timezone ?? "Pacific/Auckland";
  const currencyCode = store?.currency ?? "NZD";
  const { from, to } = resolvePresetRange(filters.preset, timezone, filters.from, filters.to);
  return querySummaryKpi({ tenantId, storeId, from, to, channels: filters.channels, currencyCode, timezone });
}
