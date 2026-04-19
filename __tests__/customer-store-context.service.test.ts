import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: vi.fn() },
    store: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    order: { findFirst: vi.fn() },
    customer: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  resolveCustomerStoreContext,
  getSelectableStores,
  saveCustomerPreferredStore,
  CUSTOMER_STORE_COOKIE,
  CUSTOMER_STORE_COOKIE_MAX_AGE,
} from "@/lib/customer-store-context";

const mockPrisma = prisma as unknown as {
  tenant: { findUnique: ReturnType<typeof vi.fn> };
  store: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  order: { findFirst: ReturnType<typeof vi.fn> };
  customer: {
    findFirst: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};

const TENANT_SLUG = "acme-coffee";
const TENANT_ID = "tenant-001";
const STORE_A = { id: "store-aaa", code: "downtown", name: "Downtown", displayName: "Downtown Store", city: "Seoul", addressLine1: "123 Main St" };
const STORE_B = { id: "store-bbb", code: "gangnam", name: "Gangnam", displayName: "Gangnam Store", city: "Seoul", addressLine1: "456 Side St" };
const USER_EMAIL = "customer@example.com";

const baseTenant = {
  id: TENANT_ID,
  slug: TENANT_SLUG,
  displayName: "Acme Coffee",
  status: "ACTIVE",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.tenant.findUnique.mockResolvedValue(null);
  mockPrisma.store.findMany.mockResolvedValue([]);
  mockPrisma.store.findFirst.mockResolvedValue(null);
  mockPrisma.order.findFirst.mockResolvedValue(null);
  mockPrisma.customer.findFirst.mockResolvedValue(null);
  mockPrisma.customer.updateMany.mockResolvedValue({ count: 0 });
});

// ─── resolveCustomerStoreContext ──────────────────────────────────────────────

describe("resolveCustomerStoreContext", () => {
  it("returns null when tenant slug does not exist", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null);
    const result = await resolveCustomerStoreContext("nonexistent");
    expect(result).toBeNull();
  });

  it("returns null when tenant is SUSPENDED", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ ...baseTenant, status: "SUSPENDED" });
    const result = await resolveCustomerStoreContext(TENANT_SLUG);
    expect(result).toBeNull();
  });

  it("returns null when tenant has no customer-facing stores", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(baseTenant);
    mockPrisma.store.findMany.mockResolvedValue([]);
    const result = await resolveCustomerStoreContext(TENANT_SLUG);
    expect(result).toBeNull();
  });

  it("auto-selects single store when no other context provided", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(baseTenant);
    mockPrisma.store.findMany.mockResolvedValue([STORE_A]);

    const result = await resolveCustomerStoreContext(TENANT_SLUG);
    expect(result).not.toBeNull();
    expect(result!.storeId).toBe(STORE_A.id);
    expect(result!.storeName).toBe(STORE_A.name);
    expect(result!.isMultiStore).toBe(false);
  });

  it("resolves store from storeCode (URL param)", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(baseTenant);
    mockPrisma.store.findMany.mockResolvedValue([STORE_A, STORE_B]);
    // findFirst for storeCode lookup returns STORE_B
    mockPrisma.store.findFirst.mockResolvedValue(STORE_B);

    const result = await resolveCustomerStoreContext(TENANT_SLUG, { storeCode: "gangnam" });
    expect(result!.storeId).toBe(STORE_B.id);
    expect(result!.storeCode).toBe(STORE_B.code);
    expect(result!.isMultiStore).toBe(true);
  });

  it("resolves store from cookieStoreId when storeCode not given", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(baseTenant);
    mockPrisma.store.findMany.mockResolvedValue([STORE_A, STORE_B]);
    // First findFirst call: no storeCode → skip. Second call: cookieStoreId validation.
    mockPrisma.store.findFirst
      .mockResolvedValueOnce(STORE_A); // validateStoreInTenant for cookie

    const result = await resolveCustomerStoreContext(TENANT_SLUG, {
      cookieStoreId: STORE_A.id,
    });
    expect(result!.storeId).toBe(STORE_A.id);
  });

  it("falls back to customer preferredStoreId", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(baseTenant);
    mockPrisma.store.findMany.mockResolvedValue([STORE_A, STORE_B]);
    // customer has preferredStoreId = STORE_B.id
    mockPrisma.customer.findFirst.mockResolvedValueOnce({ preferredStoreId: STORE_B.id });
    mockPrisma.store.findFirst.mockResolvedValueOnce(STORE_B); // validateStoreInTenant

    const result = await resolveCustomerStoreContext(TENANT_SLUG, { userEmail: USER_EMAIL });
    expect(result!.storeId).toBe(STORE_B.id);
  });

  it("falls back to most recent order store when preferred not set", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(baseTenant);
    mockPrisma.store.findMany.mockResolvedValue([STORE_A, STORE_B]);
    mockPrisma.customer.findFirst.mockResolvedValueOnce(null); // no preferred
    mockPrisma.order.findFirst.mockResolvedValueOnce({ storeId: STORE_A.id });
    mockPrisma.store.findFirst.mockResolvedValueOnce(STORE_A); // validateStoreInTenant

    const result = await resolveCustomerStoreContext(TENANT_SLUG, { userEmail: USER_EMAIL });
    expect(result!.storeId).toBe(STORE_A.id);
  });

  it("returns null when multi-store and no context can be resolved", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(baseTenant);
    mockPrisma.store.findMany.mockResolvedValue([STORE_A, STORE_B]);
    // No storeCode, no cookie, no preferred, no recent order
    mockPrisma.customer.findFirst.mockResolvedValue(null);
    mockPrisma.order.findFirst.mockResolvedValue(null);

    const result = await resolveCustomerStoreContext(TENANT_SLUG);
    expect(result).toBeNull();
  });

  it("returns correct tenant info in the context", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(baseTenant);
    mockPrisma.store.findMany.mockResolvedValue([STORE_A]);

    const result = await resolveCustomerStoreContext(TENANT_SLUG);
    expect(result!.tenantId).toBe(TENANT_ID);
    expect(result!.tenantSlug).toBe(TENANT_SLUG);
    expect(result!.tenantName).toBe("Acme Coffee");
  });
});

// ─── getSelectableStores ──────────────────────────────────────────────────────

describe("getSelectableStores", () => {
  it("returns null when tenant does not exist", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null);
    const result = await getSelectableStores("nonexistent");
    expect(result).toBeNull();
  });

  it("returns tenant info and store list", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(baseTenant);
    mockPrisma.store.findMany.mockResolvedValue([STORE_A, STORE_B]);

    const result = await getSelectableStores(TENANT_SLUG);
    expect(result).not.toBeNull();
    expect(result!.tenant.name).toBe("Acme Coffee");
    expect(result!.stores).toHaveLength(2);
    expect(result!.stores[0].code).toBe(STORE_A.code);
  });

  it("returns empty store list when no customer-facing stores exist", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(baseTenant);
    mockPrisma.store.findMany.mockResolvedValue([]);

    const result = await getSelectableStores(TENANT_SLUG);
    expect(result!.stores).toHaveLength(0);
  });
});

// ─── saveCustomerPreferredStore ───────────────────────────────────────────────

describe("saveCustomerPreferredStore", () => {
  it("calls updateMany with the correct preferredStoreId", async () => {
    await saveCustomerPreferredStore(USER_EMAIL, TENANT_ID, STORE_A.id);
    expect(mockPrisma.customer.updateMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID, email: USER_EMAIL },
      data: { preferredStoreId: STORE_A.id },
    });
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("CUSTOMER_STORE_COOKIE is the expected cookie name", () => {
    expect(CUSTOMER_STORE_COOKIE).toBe("beyond_store_ctx");
  });

  it("CUSTOMER_STORE_COOKIE_MAX_AGE is 90 days in seconds", () => {
    expect(CUSTOMER_STORE_COOKIE_MAX_AGE).toBe(90 * 24 * 60 * 60);
  });
});
