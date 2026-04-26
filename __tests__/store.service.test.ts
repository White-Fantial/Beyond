import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    store: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { createStore, getStore, getStoresByTenant } from "@/services/store.service";

const mockStore = prisma.store as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

const STORE_ROW = {
  id: "store-1",
  tenantId: "tenant-1",
  code: "S001",
  name: "Main",
  displayName: "Main Store",
  status: "ACTIVE" as const,
  phone: null,
  email: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  region: null,
  postalCode: null,
  countryCode: "US",
  timezone: "America/New_York",
  currency: "USD",
  openingDate: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  archivedAt: null,
};

describe("store.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStoresByTenant returns non-archived stores", async () => {
    mockStore.findMany.mockResolvedValue([STORE_ROW]);

    const result = await getStoresByTenant("tenant-1");

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("store-1");
    expect(mockStore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-1", status: { not: "ARCHIVED" } } })
    );
  });

  it("getStore returns null when store does not exist", async () => {
    mockStore.findFirst.mockResolvedValue(null);

    const result = await getStore("missing", "tenant-1");

    expect(result).toBeNull();
  });

  it("createStore persists and returns created store", async () => {
    mockStore.create.mockResolvedValue(STORE_ROW);

    const result = await createStore("tenant-1", {
      code: "S001",
      name: "Main",
      displayName: "Main Store",
      status: "ACTIVE",
      phone: null,
      email: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      region: null,
      postalCode: null,
      countryCode: "US",
      timezone: "America/New_York",
      currency: "USD",
      openingDate: null,
      archivedAt: null,
    });

    expect(result.id).toBe("store-1");
    expect(mockStore.create).toHaveBeenCalledOnce();
  });
});
