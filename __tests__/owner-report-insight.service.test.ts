import { describe, it, expect } from "vitest";
import {
  generateTenantInsights,
  generateStoreInsights,
} from "@/lib/owner/reports/insights";
import type {
  OwnerSummaryKpi,
  OwnerChannelBreakdownItem,
  OwnerStoreComparisonItem,
  OwnerProductPerformanceItem,
  OwnerSubscriptionSummary,
  OwnerOrderHealthSummary,
  OwnerSoldOutImpactSummary,
} from "@/types/owner-reports";

const emptySummary: OwnerSummaryKpi = {
  grossRevenueMinor: 0,
  orderCount: 0,
  averageOrderValueMinor: 0,
  completedOrderCount: 0,
  cancelledOrderCount: 0,
  completedRate: 0,
  cancelledRate: 0,
  subscriptionRevenueMinor: 0,
  subscriptionOrderCount: 0,
  currencyCode: "NZD",
};

const emptySubSummary: OwnerSubscriptionSummary = {
  activeSubscriptionCount: 0,
  pausedSubscriptionCount: 0,
  estimatedUpcoming7dRevenueMinor: 0,
  estimatedUpcoming30dRevenueMinor: 0,
  subscriptionRevenueMinor: 0,
  subscriptionOrderCount: 0,
};

const emptyOrderHealth: OwnerOrderHealthSummary = {
  totalOrders: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  failedOrders: 0,
  completedRate: 0,
  cancelledRate: 0,
  failedRate: 0,
};

const emptySoldOut: OwnerSoldOutImpactSummary = {
  soldOutProductCount: 0,
  soldOutOptionCount: 0,
  topSoldOutProducts: [],
};

describe("generateTenantInsights", () => {
  it("returns no_orders warning when orderCount is 0", () => {
    const insights = generateTenantInsights({
      summary: emptySummary,
      channelBreakdown: [],
      storeComparison: [],
      topProducts: [],
      subscriptionSummary: emptySubSummary,
      currencyCode: "NZD",
    });
    expect(insights).toHaveLength(1);
    expect(insights[0].key).toBe("no_orders");
    expect(insights[0].severity).toBe("warning");
  });

  it("returns high_cancel_rate critical insight when rate >= 15%", () => {
    const summary: OwnerSummaryKpi = {
      ...emptySummary,
      orderCount: 20,
      cancelledOrderCount: 4,
      cancelledRate: 0.2,
      completedOrderCount: 16,
      completedRate: 0.8,
    };
    const insights = generateTenantInsights({
      summary,
      channelBreakdown: [],
      storeComparison: [],
      topProducts: [],
      subscriptionSummary: emptySubSummary,
      currencyCode: "NZD",
    });
    const highCancel = insights.find((i) => i.key === "high_cancel_rate");
    expect(highCancel).toBeDefined();
    expect(highCancel?.severity).toBe("critical");
  });

  it("does NOT produce high_cancel_rate for fewer than 5 orders", () => {
    const summary: OwnerSummaryKpi = {
      ...emptySummary,
      orderCount: 3,
      cancelledOrderCount: 1,
      cancelledRate: 0.33,
    };
    const insights = generateTenantInsights({
      summary,
      channelBreakdown: [],
      storeComparison: [],
      topProducts: [],
      subscriptionSummary: emptySubSummary,
      currencyCode: "NZD",
    });
    expect(insights.find((i) => i.key === "high_cancel_rate")).toBeUndefined();
  });

  it("identifies top_channel from channelBreakdown", () => {
    const summary: OwnerSummaryKpi = { ...emptySummary, orderCount: 10, grossRevenueMinor: 10000 };
    const channelBreakdown: OwnerChannelBreakdownItem[] = [
      { channel: "POS", revenueMinor: 8000, orderCount: 8, averageOrderValueMinor: 1000, completedRate: 0.9, cancelledRate: 0.1 },
      { channel: "ONLINE", revenueMinor: 2000, orderCount: 2, averageOrderValueMinor: 1000, completedRate: 1, cancelledRate: 0 },
    ];
    const insights = generateTenantInsights({
      summary,
      channelBreakdown,
      storeComparison: [],
      topProducts: [],
      subscriptionSummary: emptySubSummary,
      currencyCode: "NZD",
    });
    const topChannel = insights.find((i) => i.key === "top_channel");
    expect(topChannel).toBeDefined();
    expect(topChannel?.title).toContain("Point of Sale");
  });

  it("identifies best_store from storeComparison", () => {
    const summary: OwnerSummaryKpi = { ...emptySummary, orderCount: 10 };
    const storeComparison: OwnerStoreComparisonItem[] = [
      { storeId: "s1", storeName: "Alpha", revenueMinor: 5000, orderCount: 5, averageOrderValueMinor: 1000, connectedChannelCount: 2, activeSubscriptionCount: 0, cancelledRate: 0, currencyCode: "NZD" },
      { storeId: "s2", storeName: "Beta", revenueMinor: 3000, orderCount: 3, averageOrderValueMinor: 1000, connectedChannelCount: 1, activeSubscriptionCount: 0, cancelledRate: 0, currencyCode: "NZD" },
    ];
    const insights = generateTenantInsights({
      summary,
      channelBreakdown: [],
      storeComparison,
      topProducts: [],
      subscriptionSummary: emptySubSummary,
      currencyCode: "NZD",
    });
    const bestStore = insights.find((i) => i.key === "best_store");
    expect(bestStore).toBeDefined();
    expect(bestStore?.title).toContain("Alpha");
  });

  it("returns strong_sub_share positive insight when subscription share >= 20%", () => {
    const summary: OwnerSummaryKpi = {
      ...emptySummary,
      orderCount: 10,
      grossRevenueMinor: 10000,
      subscriptionRevenueMinor: 3000,
    };
    const insights = generateTenantInsights({
      summary,
      channelBreakdown: [],
      storeComparison: [],
      topProducts: [],
      subscriptionSummary: emptySubSummary,
      currencyCode: "NZD",
    });
    const subShare = insights.find((i) => i.key === "strong_sub_share");
    expect(subShare).toBeDefined();
    expect(subShare?.severity).toBe("positive");
  });

  it("generates soldout warning when top product is sold out", () => {
    const summary: OwnerSummaryKpi = { ...emptySummary, orderCount: 10, grossRevenueMinor: 10000 };
    const topProducts: OwnerProductPerformanceItem[] = [
      { productId: "p1", productName: "Pizza", categoryName: "Mains", quantitySold: 20, revenueMinor: 5000, orderCount: 5, soldOutFlag: true, isSubscriptionEligible: false },
    ];
    const insights = generateTenantInsights({
      summary,
      channelBreakdown: [],
      storeComparison: [],
      topProducts,
      subscriptionSummary: emptySubSummary,
      currencyCode: "NZD",
    });
    const soldOutInsight = insights.find((i) => i.key.startsWith("soldout_"));
    expect(soldOutInsight).toBeDefined();
    expect(soldOutInsight?.severity).toBe("warning");
  });
});

describe("generateStoreInsights", () => {
  it("returns no_orders warning when orderCount is 0", () => {
    const insights = generateStoreInsights({
      summary: emptySummary,
      channelBreakdown: [],
      topProducts: [],
      subscriptionSummary: emptySubSummary,
      orderHealth: emptyOrderHealth,
      soldOutImpact: emptySoldOut,
      currencyCode: "NZD",
    });
    expect(insights[0].key).toBe("no_orders");
  });

  it("returns soldout_impact warning when products are sold out", () => {
    const summary: OwnerSummaryKpi = { ...emptySummary, orderCount: 10 };
    const soldOutImpact: OwnerSoldOutImpactSummary = {
      soldOutProductCount: 3,
      soldOutOptionCount: 1,
      topSoldOutProducts: [],
    };
    const insights = generateStoreInsights({
      summary,
      channelBreakdown: [],
      topProducts: [],
      subscriptionSummary: emptySubSummary,
      orderHealth: emptyOrderHealth,
      soldOutImpact,
      currencyCode: "NZD",
    });
    expect(insights.find((i) => i.key === "soldout_impact")).toBeDefined();
  });

  it("insights are deterministic (same output for same input)", () => {
    const summary: OwnerSummaryKpi = { ...emptySummary, orderCount: 10, grossRevenueMinor: 5000 };
    const input = {
      summary,
      channelBreakdown: [],
      topProducts: [],
      subscriptionSummary: emptySubSummary,
      orderHealth: emptyOrderHealth,
      soldOutImpact: emptySoldOut,
      currencyCode: "NZD",
    };
    expect(generateStoreInsights(input)).toEqual(generateStoreInsights(input));
  });
});
