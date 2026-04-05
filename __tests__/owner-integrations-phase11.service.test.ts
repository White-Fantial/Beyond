import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    store: { findMany: vi.fn() },
    connection: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    connectionActionLog: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  getOwnerTenantConnectionCards,
  disconnectOwnerConnection,
  getOwnerConnectionActionLogs,
} from "@/services/owner/owner-integrations.service";

const mockPrisma = prisma as unknown as {
  store: { findMany: ReturnType<typeof vi.fn> };
  connection: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  connectionActionLog: { findMany: ReturnType<typeof vi.fn> };
};
const mockLogAudit = logAuditEvent as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-aaa";
const STORE_ID = "store-111";
const CONN_ID = "conn-001";
const USER_ID = "user-001";

function makeConn(overrides: Partial<{
  id: string;
  storeId: string;
  provider: string;
  type: string;
  status: string;
  authScheme: string | null;
  externalStoreName: string | null;
  externalMerchantId: string | null;
  lastConnectedAt: Date | null;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  reauthRequiredAt: Date | null;
  lastErrorMessage: string | null;
}> = {}) {
  return {
    id: CONN_ID,
    storeId: STORE_ID,
    provider: "LOYVERSE",
    type: "POS",
    status: "CONNECTED",
    authScheme: "OAUTH2",
    externalStoreName: "My Shop",
    externalMerchantId: "ext-123",
    lastConnectedAt: new Date("2026-01-01T00:00:00Z"),
    lastSyncAt: new Date("2026-01-15T12:00:00Z"),
    lastSyncStatus: "SUCCESS",
    reauthRequiredAt: null,
    lastErrorMessage: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getOwnerTenantConnectionCards ───────────────────────────────────────────

describe("getOwnerTenantConnectionCards", () => {
  it("returns cards for all stores × known providers", async () => {
    mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_ID, name: "Store One" }]);
    mockPrisma.connection.findMany.mockResolvedValue([makeConn()]);

    const result = await getOwnerTenantConnectionCards(TENANT_ID);

    // 4 known providers × 1 store = 4 cards
    expect(result).toHaveLength(4);
    const loyverse = result.find((c) => c.provider === "LOYVERSE");
    expect(loyverse).toMatchObject({
      connectionId: CONN_ID,
      status: "CONNECTED",
      storeName: "Store One",
      externalStoreName: "My Shop",
    });
  });

  it("shows NOT_CONNECTED for providers without a connection", async () => {
    mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_ID, name: "Store One" }]);
    mockPrisma.connection.findMany.mockResolvedValue([]);

    const result = await getOwnerTenantConnectionCards(TENANT_ID);

    expect(result.every((c) => c.status === "NOT_CONNECTED")).toBe(true);
    expect(result.every((c) => c.connectionId === null)).toBe(true);
  });

  it("groups UBER_EATS and DOORDASH as DELIVERY type", async () => {
    mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_ID, name: "Store One" }]);
    mockPrisma.connection.findMany.mockResolvedValue([]);

    const result = await getOwnerTenantConnectionCards(TENANT_ID);

    const deliveryCards = result.filter((c) => c.connectionType === "DELIVERY");
    expect(deliveryCards).toHaveLength(2);
    expect(deliveryCards.map((c) => c.provider).sort()).toEqual(["DOORDASH", "UBER_EATS"]);
  });

  it("handles multiple stores", async () => {
    mockPrisma.store.findMany.mockResolvedValue([
      { id: "store-a", name: "Store A" },
      { id: "store-b", name: "Store B" },
    ]);
    mockPrisma.connection.findMany.mockResolvedValue([
      makeConn({ storeId: "store-a", provider: "LOYVERSE", type: "POS" }),
    ]);

    const result = await getOwnerTenantConnectionCards(TENANT_ID);

    // 4 providers × 2 stores = 8 cards
    expect(result).toHaveLength(8);
    const storeALoyverse = result.find(
      (c) => c.storeId === "store-a" && c.provider === "LOYVERSE"
    );
    expect(storeALoyverse?.status).toBe("CONNECTED");

    const storeBLoyverse = result.find(
      (c) => c.storeId === "store-b" && c.provider === "LOYVERSE"
    );
    expect(storeBLoyverse?.status).toBe("NOT_CONNECTED");
  });

  it("sets reauthRequired true when reauthRequiredAt is set", async () => {
    mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_ID, name: "Store One" }]);
    mockPrisma.connection.findMany.mockResolvedValue([
      makeConn({ reauthRequiredAt: new Date() }),
    ]);

    const result = await getOwnerTenantConnectionCards(TENANT_ID);

    const loyverse = result.find((c) => c.provider === "LOYVERSE");
    expect(loyverse?.reauthRequired).toBe(true);
  });

  it("returns empty array when no stores", async () => {
    mockPrisma.store.findMany.mockResolvedValue([]);
    mockPrisma.connection.findMany.mockResolvedValue([]);

    const result = await getOwnerTenantConnectionCards(TENANT_ID);
    expect(result).toHaveLength(0);
  });

  it("includes LIGHTSPEED in known providers", async () => {
    mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_ID, name: "Store One" }]);
    mockPrisma.connection.findMany.mockResolvedValue([]);

    const result = await getOwnerTenantConnectionCards(TENANT_ID);

    const lightspeed = result.find((c) => c.provider === "LIGHTSPEED");
    expect(lightspeed).toBeDefined();
    expect(lightspeed?.connectionType).toBe("POS");
  });
});

// ─── disconnectOwnerConnection ────────────────────────────────────────────────

describe("disconnectOwnerConnection", () => {
  it("sets status to DISCONNECTED", async () => {
    mockPrisma.connection.findFirst.mockResolvedValue({
      id: CONN_ID,
      storeId: STORE_ID,
      provider: "LOYVERSE",
    });
    mockPrisma.connection.update.mockResolvedValue({});

    await disconnectOwnerConnection(CONN_ID, TENANT_ID, USER_ID);

    expect(mockPrisma.connection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CONN_ID },
        data: expect.objectContaining({ status: "DISCONNECTED" }),
      })
    );
  });

  it("throws when connection not found or belongs to different tenant", async () => {
    mockPrisma.connection.findFirst.mockResolvedValue(null);

    await expect(
      disconnectOwnerConnection(CONN_ID, TENANT_ID, USER_ID)
    ).rejects.toThrow("CONNECTION_NOT_FOUND");
  });

  it("logs audit event with INTEGRATION_DISCONNECTED", async () => {
    mockPrisma.connection.findFirst.mockResolvedValue({
      id: CONN_ID,
      storeId: STORE_ID,
      provider: "LOYVERSE",
    });
    mockPrisma.connection.update.mockResolvedValue({});

    await disconnectOwnerConnection(CONN_ID, TENANT_ID, USER_ID);

    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "INTEGRATION_DISCONNECTED",
        targetType: "Connection",
        targetId: CONN_ID,
        tenantId: TENANT_ID,
        actorUserId: USER_ID,
      })
    );
  });
});

// ─── getOwnerConnectionActionLogs ─────────────────────────────────────────────

describe("getOwnerConnectionActionLogs", () => {
  it("returns action logs for connection", async () => {
    mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_ID, name: "Store One" }]);
    mockPrisma.connectionActionLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        actionType: "CONNECT_SUCCESS",
        status: "OK",
        provider: "LOYVERSE",
        storeId: STORE_ID,
        errorCode: null,
        message: "Connected OK",
        createdAt: new Date("2026-01-15T10:00:00Z"),
      },
    ]);

    const result = await getOwnerConnectionActionLogs(CONN_ID, TENANT_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      actionType: "CONNECT_SUCCESS",
      storeName: "Store One",
      message: "Connected OK",
    });
  });

  it("resolves store name from store map", async () => {
    mockPrisma.store.findMany.mockResolvedValue([
      { id: STORE_ID, name: "My Restaurant" },
    ]);
    mockPrisma.connectionActionLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        actionType: "CONNECT_FAIL",
        status: "FAIL",
        provider: "LOYVERSE",
        storeId: STORE_ID,
        errorCode: "AUTH_ERROR",
        message: null,
        createdAt: new Date(),
      },
    ]);

    const result = await getOwnerConnectionActionLogs(CONN_ID, TENANT_ID);

    expect(result[0].storeName).toBe("My Restaurant");
  });

  it("queries with correct tenant and connectionId filter", async () => {
    mockPrisma.store.findMany.mockResolvedValue([]);
    mockPrisma.connectionActionLog.findMany.mockResolvedValue([]);

    await getOwnerConnectionActionLogs(CONN_ID, TENANT_ID, 10);

    expect(mockPrisma.connectionActionLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, connectionId: CONN_ID },
        take: 10,
      })
    );
  });

  it("returns empty array when no logs", async () => {
    mockPrisma.store.findMany.mockResolvedValue([]);
    mockPrisma.connectionActionLog.findMany.mockResolvedValue([]);

    const result = await getOwnerConnectionActionLogs(CONN_ID, TENANT_ID);

    expect(result).toHaveLength(0);
  });
});
