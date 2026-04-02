import { describe, it, expect } from "vitest";
import {
  parseReportFilters,
  resolvePresetRange,
  resolveComparePeriod,
  generateDateKeys,
} from "@/lib/owner/reports/filters";

const TZ = "Pacific/Auckland";

describe("parseReportFilters", () => {
  it("returns defaults for empty params", () => {
    const params = new URLSearchParams();
    const filters = parseReportFilters(params);
    expect(filters.preset).toBe("last7");
    expect(filters.comparePrevious).toBe(true);
    expect(filters.channels).toBeUndefined();
    expect(filters.storeIds).toBeUndefined();
  });

  it("parses valid preset", () => {
    const params = new URLSearchParams({ preset: "today" });
    expect(parseReportFilters(params).preset).toBe("today");
  });

  it("falls back to last7 for invalid preset", () => {
    const params = new URLSearchParams({ preset: "invalid_preset" });
    expect(parseReportFilters(params).preset).toBe("last7");
  });

  it("parses comparePrevious=false", () => {
    const params = new URLSearchParams({ comparePrevious: "false" });
    expect(parseReportFilters(params).comparePrevious).toBe(false);
  });

  it("parses channels from comma-separated string", () => {
    const params = new URLSearchParams({ channels: "POS,UBER_EATS,ONLINE" });
    const filters = parseReportFilters(params);
    expect(filters.channels).toEqual(["POS", "UBER_EATS", "ONLINE"]);
  });

  it("filters out invalid channel values", () => {
    const params = new URLSearchParams({ channels: "POS,INVALID_CHANNEL,ONLINE" });
    const filters = parseReportFilters(params);
    expect(filters.channels).toEqual(["POS", "ONLINE"]);
  });

  it("parses storeIds from comma-separated string", () => {
    const params = new URLSearchParams({ storeIds: "store-a,store-b" });
    const filters = parseReportFilters(params);
    expect(filters.storeIds).toEqual(["store-a", "store-b"]);
  });

  it("ignores invalid custom dates and falls back", () => {
    const params = new URLSearchParams({ preset: "custom", from: "not-a-date", to: "also-invalid" });
    const filters = parseReportFilters(params);
    expect(filters.from).toBeUndefined();
    expect(filters.to).toBeUndefined();
  });

  it("accepts valid custom date range", () => {
    const params = new URLSearchParams({ preset: "custom", from: "2025-01-01", to: "2025-01-31" });
    const filters = parseReportFilters(params);
    expect(filters.from).toBe("2025-01-01");
    expect(filters.to).toBe("2025-01-31");
  });
});

describe("resolvePresetRange", () => {
  it("today range: from < to and both are same local date", () => {
    const { from, to } = resolvePresetRange("today", TZ);
    expect(from.getTime()).toBeLessThan(to.getTime());
    expect(to.getTime() - from.getTime()).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it("last7 range spans approximately 7 days", () => {
    const { from, to } = resolvePresetRange("last7", TZ);
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(6);
    expect(diffDays).toBeLessThan(8);
  });

  it("last30 range spans approximately 30 days", () => {
    const { from, to } = resolvePresetRange("last30", TZ);
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });

  it("custom range uses provided from/to", () => {
    const { from, to } = resolvePresetRange("custom", TZ, "2025-03-01", "2025-03-31");
    expect(from.getTime()).toBeLessThan(to.getTime());
  });

  it("custom range without dates falls back to last7", () => {
    const { from, to } = resolvePresetRange("custom", TZ);
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(6);
    expect(diffDays).toBeLessThan(8);
  });

  it("uses default timezone for invalid timezone input", () => {
    expect(() => resolvePresetRange("today", "Invalid/Timezone")).not.toThrow();
  });

  it("thisMonth from is start of current month", () => {
    const { from } = resolvePresetRange("thisMonth", TZ);
    const localDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      day: "numeric",
    }).format(from);
    expect(localDay).toBe("1");
  });
});

describe("resolveComparePeriod", () => {
  it("returns a period of the same duration immediately before the input", () => {
    const from = new Date("2025-03-24T00:00:00Z");
    const to = new Date("2025-03-30T23:59:59Z");
    const { from: cFrom, to: cTo } = resolveComparePeriod(from, to);

    expect(cTo.getTime()).toBeLessThan(from.getTime());

    const originalDuration = to.getTime() - from.getTime();
    const compareDuration = cTo.getTime() - cFrom.getTime();
    expect(compareDuration).toBeCloseTo(originalDuration, -2);
  });
});

describe("generateDateKeys", () => {
  it("generates correct number of keys for a week", () => {
    const from = new Date("2025-03-24T00:00:00Z");
    const to = new Date("2025-03-30T23:59:59Z");
    const keys = generateDateKeys(from, to, "UTC");
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe("2025-03-24");
    expect(keys[6]).toBe("2025-03-30");
  });

  it("generates correct key for a single day", () => {
    const from = new Date("2025-04-01T00:00:00Z");
    const to = new Date("2025-04-01T23:59:59Z");
    const keys = generateDateKeys(from, to, "UTC");
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe("2025-04-01");
  });
});
