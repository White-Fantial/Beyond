/**
 * Owner Report Insight Service — derives human-readable insight items from aggregated data.
 *
 * All insight generation is rule-based and deterministic.
 * No AI or external dependencies.
 */

import type {
  OwnerInsightItem,
  TenantOwnerReportsData,
  StoreOwnerReportsData,
} from "@/types/owner-reports";
import {
  generateTenantInsights,
  generateStoreInsights,
} from "@/lib/owner/reports/insights";

export function deriveTenantInsights(data: Omit<TenantOwnerReportsData, "insights">): OwnerInsightItem[] {
  return generateTenantInsights({
    summary: data.summary,
    channelBreakdown: data.channelBreakdown,
    storeComparison: data.storeComparison,
    topProducts: data.topProducts,
    subscriptionSummary: data.subscriptionSummary,
    currencyCode: data.currencyCode,
  });
}

export function deriveStoreInsights(data: Omit<StoreOwnerReportsData, "insights">): OwnerInsightItem[] {
  return generateStoreInsights({
    summary: data.summary,
    channelBreakdown: data.channelBreakdown,
    topProducts: data.productPerformance,
    subscriptionSummary: data.subscriptionSummary,
    orderHealth: data.orderHealth,
    soldOutImpact: data.soldOutImpact,
    currencyCode: data.currencyCode,
  });
}
