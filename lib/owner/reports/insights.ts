/**
 * Owner Reports — rule-based insight generation helpers.
 *
 * All insight generation is deterministic — no AI, no external calls.
 * Inputs are already-aggregated report data; outputs are OwnerInsightItem arrays.
 */

import type {
  OwnerInsightItem,
  OwnerSummaryKpi,
  OwnerChannelBreakdownItem,
  OwnerStoreComparisonItem,
  OwnerProductPerformanceItem,
  OwnerSubscriptionSummary,
  OwnerOrderHealthSummary,
  OwnerSoldOutImpactSummary,
} from "@/types/owner-reports";
import { channelLabel } from "./labels";

// Thresholds
const HIGH_CANCEL_RATE = 0.15; // 15%
const STRONG_SUB_SHARE  = 0.2;  // 20% of revenue from subscriptions

export function generateTenantInsights(input: {
  summary: OwnerSummaryKpi;
  channelBreakdown: OwnerChannelBreakdownItem[];
  storeComparison: OwnerStoreComparisonItem[];
  topProducts: OwnerProductPerformanceItem[];
  subscriptionSummary: OwnerSubscriptionSummary;
  currencyCode: string;
}): OwnerInsightItem[] {
  const items: OwnerInsightItem[] = [];
  const { summary, channelBreakdown, storeComparison, topProducts, subscriptionSummary } = input;

  // No activity
  if (summary.orderCount === 0) {
    items.push({
      key: "no_orders",
      severity: "warning",
      title: "No orders in selected period",
      description: "No orders were recorded in the selected date range. Try widening the date range.",
    });
    return items;
  }

  // No completed orders
  if (summary.completedOrderCount === 0 && summary.orderCount > 0) {
    items.push({
      key: "no_completed",
      severity: "warning",
      title: "No completed orders",
      description: "Orders were placed but none were marked completed. Check your fulfilment workflow.",
    });
  }

  // High overall cancellation rate
  if (summary.cancelledRate >= HIGH_CANCEL_RATE && summary.orderCount >= 5) {
    items.push({
      key: "high_cancel_rate",
      severity: "critical",
      title: `High cancellation rate: ${(summary.cancelledRate * 100).toFixed(0)}%`,
      description: "More than 15% of orders were cancelled. Review operations or channel reliability.",
    });
  }

  // Top revenue channel
  if (channelBreakdown.length > 0) {
    const top = [...channelBreakdown].sort((a, b) => b.revenueMinor - a.revenueMinor)[0];
    items.push({
      key: "top_channel",
      severity: "positive",
      title: `${channelLabel(top.channel)} is your top revenue channel`,
      description: `${channelLabel(top.channel)} contributed the most revenue in this period.`,
    });

    // Highest cancellation channel
    const highCancelChannel = channelBreakdown
      .filter((c) => c.orderCount >= 3)
      .sort((a, b) => b.cancelledRate - a.cancelledRate)[0];
    if (highCancelChannel && highCancelChannel.cancelledRate >= HIGH_CANCEL_RATE) {
      items.push({
        key: `cancel_channel_${highCancelChannel.channel}`,
        severity: "warning",
        title: `High cancellations on ${channelLabel(highCancelChannel.channel)}`,
        description: `${(highCancelChannel.cancelledRate * 100).toFixed(0)}% of ${channelLabel(highCancelChannel.channel)} orders were cancelled.`,
      });
    }
  }

  // Best performing store
  if (storeComparison.length > 1) {
    const best = [...storeComparison].sort((a, b) => b.revenueMinor - a.revenueMinor)[0];
    items.push({
      key: "best_store",
      severity: "info",
      title: `${best.storeName} is your top-performing store`,
      description: `${best.storeName} generated the most revenue in this period.`,
    });
  }

  // Strongest product
  if (topProducts.length > 0) {
    const best = topProducts[0];
    items.push({
      key: "best_product",
      severity: "positive",
      title: `"${best.productName}" is your best-selling product`,
      description: `${best.quantitySold} units sold in this period.`,
    });

    // Sold-out warning on high-performing product
    const soldOutHit = topProducts.find((p) => p.soldOutFlag);
    if (soldOutHit) {
      items.push({
        key: `soldout_${soldOutHit.productId}`,
        severity: "warning",
        title: `"${soldOutHit.productName}" is sold out`,
        description: `This top-selling product is currently marked as sold out and may be losing sales.`,
      });
    }
  }

  // Strong subscription share
  if (summary.grossRevenueMinor > 0) {
    const subShare = summary.subscriptionRevenueMinor / summary.grossRevenueMinor;
    if (subShare >= STRONG_SUB_SHARE) {
      items.push({
        key: "strong_sub_share",
        severity: "positive",
        title: `${(subShare * 100).toFixed(0)}% of revenue from subscriptions`,
        description: "Subscription orders are a strong revenue driver. Consider growing this channel.",
      });
    }
  }

  // Active subscriptions
  if (subscriptionSummary.activeSubscriptionCount > 0) {
    items.push({
      key: "active_subs",
      severity: "info",
      title: `${subscriptionSummary.activeSubscriptionCount} active subscriptions`,
      description: `Estimated upcoming 7-day subscription revenue is available in the subscription summary.`,
    });
  }

  return items;
}

export function generateStoreInsights(input: {
  summary: OwnerSummaryKpi;
  channelBreakdown: OwnerChannelBreakdownItem[];
  topProducts: OwnerProductPerformanceItem[];
  subscriptionSummary: OwnerSubscriptionSummary;
  orderHealth: OwnerOrderHealthSummary;
  soldOutImpact: OwnerSoldOutImpactSummary;
  currencyCode: string;
}): OwnerInsightItem[] {
  const items: OwnerInsightItem[] = [];
  const { summary, channelBreakdown, topProducts, subscriptionSummary, orderHealth, soldOutImpact } = input;

  // No activity
  if (summary.orderCount === 0) {
    items.push({
      key: "no_orders",
      severity: "warning",
      title: "No orders in selected period",
      description: "No orders were recorded for this store in the selected date range.",
    });
    return items;
  }

  // High cancellation rate
  if (orderHealth.cancelledRate >= HIGH_CANCEL_RATE && orderHealth.totalOrders >= 5) {
    items.push({
      key: "high_cancel_rate",
      severity: "critical",
      title: `High cancellation rate: ${(orderHealth.cancelledRate * 100).toFixed(0)}%`,
      description: "More than 15% of orders were cancelled. Investigate channel or fulfilment issues.",
    });
  }

  // Top channel
  if (channelBreakdown.length > 0) {
    const top = [...channelBreakdown].sort((a, b) => b.revenueMinor - a.revenueMinor)[0];
    items.push({
      key: "top_channel",
      severity: "positive",
      title: `${channelLabel(top.channel)} leads revenue`,
      description: `${channelLabel(top.channel)} is the top revenue-generating channel for this store.`,
    });

    const highCancelCh = channelBreakdown
      .filter((c) => c.orderCount >= 3)
      .sort((a, b) => b.cancelledRate - a.cancelledRate)[0];
    if (highCancelCh && highCancelCh.cancelledRate >= HIGH_CANCEL_RATE) {
      items.push({
        key: `cancel_channel_${highCancelCh.channel}`,
        severity: "warning",
        title: `High cancellations on ${channelLabel(highCancelCh.channel)}`,
        description: `${(highCancelCh.cancelledRate * 100).toFixed(0)}% cancellation rate on ${channelLabel(highCancelCh.channel)}.`,
      });
    }
  }

  // Best product
  if (topProducts.length > 0) {
    const best = topProducts[0];
    items.push({
      key: "best_product",
      severity: "positive",
      title: `"${best.productName}" is your top product`,
      description: `${best.quantitySold} units sold in this period.`,
    });

    const soldOutHit = topProducts.find((p) => p.soldOutFlag);
    if (soldOutHit) {
      items.push({
        key: `soldout_${soldOutHit.productId}`,
        severity: "warning",
        title: `"${soldOutHit.productName}" is sold out`,
        description: `This high-performing product is currently marked as sold out.`,
      });
    }
  }

  // Sold-out impact
  if (soldOutImpact.soldOutProductCount > 0) {
    items.push({
      key: "soldout_impact",
      severity: "warning",
      title: `${soldOutImpact.soldOutProductCount} product(s) currently sold out`,
      description: "Sold-out products may be reducing your order conversions. Review stock levels.",
    });
  }

  // Subscription share
  if (summary.grossRevenueMinor > 0) {
    const subShare = summary.subscriptionRevenueMinor / summary.grossRevenueMinor;
    if (subShare >= STRONG_SUB_SHARE) {
      items.push({
        key: "strong_sub_share",
        severity: "positive",
        title: `${(subShare * 100).toFixed(0)}% of revenue from subscriptions`,
        description: "Subscriptions are a healthy part of revenue for this store.",
      });
    }
  }

  // Active subscriptions
  if (subscriptionSummary.activeSubscriptionCount > 0) {
    items.push({
      key: "active_subs",
      severity: "info",
      title: `${subscriptionSummary.activeSubscriptionCount} active subscriptions`,
      description: `${subscriptionSummary.activeSubscriptionCount} customers have active subscription plans.`,
    });
  }

  return items;
}
