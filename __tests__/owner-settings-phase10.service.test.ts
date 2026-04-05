import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    store: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    catalogSettings: {
      upsert: vi.fn(),
    },
    storeOperationSettings: {
      upsert: vi.fn(),
    },
    storeHours: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  getCatalogSettingsForTenant,
  updateOwnerCatalogSettings,
  getOwnerTenantSettings,
  updateOwnerTenantSettings,
  updateOwnerStoreBasicInfo,
  updateOwnerOperationSettings,
} from "@/services/owner/owner-settings.service";

const mockPrisma = prisma as unknown as {
  store: { findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  tenant: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  catalogSettings: { upsert: ReturnType<typeof vi.fn> };
  storeOperationSettings: { upsert: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockLogAudit = logAuditEvent as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-aaa";
const STORE_ID = "store-111";
const USER_ID = "user-001";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getCatalogSettingsForTenant ──────────────────────────────────────────────

describe("getCatalogSettingsForTenant", () => {
  it("returns catalog settings for all stores", async () => {
    mockPrisma.store.findMany.mockResolvedValue([
      {
        id: STORE_ID,
        name: "Store One",
        catalogSettings: {
          id: "cs-1",
          sourceConnectionId: null,
          sourceType: "POS",
          autoSync: true,
          syncIntervalMinutes: 30,
        },
      },
    ]);

    const result = await getCatalogSettingsForTenant(TENANT_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      storeId: STORE_ID,
      storeName: "Store One",
      sourceType: "POS",
      autoSync: true,
      syncIntervalMinutes: 30,
    });
  });

  it("returns defaults when catalogSettings is null", async () => {
    mockPrisma.store.findMany.mockResolvedValue([
      { id: STORE_ID, name: "Store One", catalogSettings: null },
    ]);

    const result = await getCatalogSettingsForTenant(TENANT_ID);

    expect(result[0]).toMatchObject({
      sourceType: "LOCAL",
      autoSync: false,
      syncIntervalMinutes: 60,
      sourceConnectionId: null,
      id: null,
    });
  });

  it("returns empty array when no stores", async () => {
    mockPrisma.store.findMany.mockResolvedValue([]);
    const result = await getCatalogSettingsForTenant(TENANT_ID);
    expect(result).toHaveLength(0);
  });

  it("queries with correct tenant filter excluding ARCHIVED", async () => {
    mockPrisma.store.findMany.mockResolvedValue([]);

    await getCatalogSettingsForTenant(TENANT_ID);

    expect(mockPrisma.store.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          status: { not: "ARCHIVED" },
        }),
      })
    );
  });
});

// ─── updateOwnerCatalogSettings ───────────────────────────────────────────────

describe("updateOwnerCatalogSettings", () => {
  it("upserts catalog settings", async () => {
    mockPrisma.catalogSettings.upsert.mockResolvedValue({});

    await updateOwnerCatalogSettings({
      storeId: STORE_ID,
      tenantId: TENANT_ID,
      actorUserId: USER_ID,
      data: { autoSync: true, syncIntervalMinutes: 45 },
    });

    expect(mockPrisma.catalogSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: STORE_ID },
        update: expect.objectContaining({ autoSync: true, syncIntervalMinutes: 45 }),
      })
    );
  });

  it("logs audit event on update", async () => {
    mockPrisma.catalogSettings.upsert.mockResolvedValue({});

    await updateOwnerCatalogSettings({
      storeId: STORE_ID,
      tenantId: TENANT_ID,
      actorUserId: USER_ID,
      data: { autoSync: false },
    });

    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        storeId: STORE_ID,
        actorUserId: USER_ID,
        action: "OWNER_STORE_SETTINGS_UPDATED",
        targetType: "CatalogSettings",
      })
    );
  });
});

// ─── getOwnerTenantSettings ───────────────────────────────────────────────────

describe("getOwnerTenantSettings", () => {
  it("returns tenant settings", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: TENANT_ID,
      displayName: "My Restaurant",
      legalName: "My Restaurant Ltd",
      timezone: "Pacific/Auckland",
      currency: "NZD",
      countryCode: "NZ",
    });

    const result = await getOwnerTenantSettings(TENANT_ID);

    expect(result).toMatchObject({
      id: TENANT_ID,
      displayName: "My Restaurant",
      legalName: "My Restaurant Ltd",
      timezone: "Pacific/Auckland",
      currency: "NZD",
      countryCode: "NZ",
    });
  });

  it("returns null when tenant not found", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null);

    const result = await getOwnerTenantSettings(TENANT_ID);

    expect(result).toBeNull();
  });

  it("queries with correct tenant ID", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null);

    await getOwnerTenantSettings(TENANT_ID);

    expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TENANT_ID } })
    );
  });
});

// ─── updateOwnerTenantSettings ────────────────────────────────────────────────

describe("updateOwnerTenantSettings", () => {
  it("updates tenant with provided data", async () => {
    mockPrisma.tenant.update.mockResolvedValue({});

    await updateOwnerTenantSettings({
      tenantId: TENANT_ID,
      actorUserId: USER_ID,
      data: { displayName: "New Name", timezone: "Asia/Seoul" },
    });

    expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TENANT_ID },
        data: expect.objectContaining({ displayName: "New Name", timezone: "Asia/Seoul" }),
      })
    );
  });

  it("logs audit event on update", async () => {
    mockPrisma.tenant.update.mockResolvedValue({});

    await updateOwnerTenantSettings({
      tenantId: TENANT_ID,
      actorUserId: USER_ID,
      data: { currency: "KRW" },
    });

    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        actorUserId: USER_ID,
        action: "OWNER_STORE_SETTINGS_UPDATED",
        targetType: "Tenant",
        targetId: TENANT_ID,
      })
    );
  });

  it("logs changed fields in metadata", async () => {
    mockPrisma.tenant.update.mockResolvedValue({});

    await updateOwnerTenantSettings({
      tenantId: TENANT_ID,
      actorUserId: USER_ID,
      data: { displayName: "X", timezone: "UTC" },
    });

    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { fields: expect.arrayContaining(["displayName", "timezone"]) },
      })
    );
  });
});

// ─── updateOwnerStoreBasicInfo ────────────────────────────────────────────────

describe("updateOwnerStoreBasicInfo", () => {
  it("updates store fields", async () => {
    mockPrisma.store.update.mockResolvedValue({});

    await updateOwnerStoreBasicInfo({
      storeId: STORE_ID,
      tenantId: TENANT_ID,
      actorUserId: USER_ID,
      data: { displayName: "New Store Name", email: "store@example.com" },
    });

    expect(mockPrisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: STORE_ID },
        data: expect.objectContaining({
          displayName: "New Store Name",
          email: "store@example.com",
        }),
      })
    );
  });

  it("logs audit event", async () => {
    mockPrisma.store.update.mockResolvedValue({});

    await updateOwnerStoreBasicInfo({
      storeId: STORE_ID,
      tenantId: TENANT_ID,
      actorUserId: USER_ID,
      data: { phone: "555-1234" },
    });

    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OWNER_STORE_SETTINGS_UPDATED",
        targetType: "Store",
        targetId: STORE_ID,
      })
    );
  });
});

// ─── updateOwnerOperationSettings ────────────────────────────────────────────

describe("updateOwnerOperationSettings", () => {
  it("upserts operation settings", async () => {
    mockPrisma.storeOperationSettings.upsert.mockResolvedValue({});

    await updateOwnerOperationSettings({
      storeId: STORE_ID,
      tenantId: TENANT_ID,
      actorUserId: USER_ID,
      data: { storeOpen: false, holidayMode: true },
    });

    expect(mockPrisma.storeOperationSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: STORE_ID },
      })
    );
  });

  it("logs audit event", async () => {
    mockPrisma.storeOperationSettings.upsert.mockResolvedValue({});

    await updateOwnerOperationSettings({
      storeId: STORE_ID,
      tenantId: TENANT_ID,
      actorUserId: USER_ID,
      data: { autoAcceptOrders: true },
    });

    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OWNER_STORE_SETTINGS_UPDATED",
        targetType: "StoreOperationSettings",
      })
    );
  });
});
