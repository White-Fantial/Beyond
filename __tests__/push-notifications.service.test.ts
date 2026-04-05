import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pushSubscription: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/push/send", () => ({
  sendPushNotification: vi.fn(),
  getVapidPublicKey: vi.fn().mockReturnValue("test-key"),
}));

import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push/send";
import {
  registerPushSubscription,
  unregisterPushSubscription,
  sendPushToUser,
  listPushSubscriptions,
} from "@/services/push-notifications.service";
import { validatePushSubscriptionInput } from "@/lib/push/subscribe";

const mockUpsert = vi.mocked(prisma.pushSubscription.upsert);
const mockDeleteMany = vi.mocked(prisma.pushSubscription.deleteMany);
const mockFindMany = vi.mocked(prisma.pushSubscription.findMany);
const mockSendPush = vi.mocked(sendPushNotification);

const baseRow = {
  id: "sub-1",
  userId: "user-1",
  endpoint: "https://push.example.com/sub/1",
  p256dhKey: "key-p256dh",
  authKey: "key-auth",
  userAgent: "Mozilla/5.0",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── validatePushSubscriptionInput ───────────────────────────────────────────

describe("validatePushSubscriptionInput", () => {
  it("returns validated input for a valid object", () => {
    const result = validatePushSubscriptionInput({
      endpoint: "https://example.com/push",
      p256dhKey: "abc123",
      authKey: "def456",
      userAgent: "TestAgent",
    });
    expect(result).toEqual({
      endpoint: "https://example.com/push",
      p256dhKey: "abc123",
      authKey: "def456",
      userAgent: "TestAgent",
    });
  });

  it("omits userAgent when not a string", () => {
    const result = validatePushSubscriptionInput({
      endpoint: "https://example.com/push",
      p256dhKey: "abc123",
      authKey: "def456",
    });
    expect(result.userAgent).toBeUndefined();
  });

  it("throws when input is null", () => {
    expect(() => validatePushSubscriptionInput(null)).toThrow(
      "Push subscription input must be an object"
    );
  });

  it("throws when input is not an object", () => {
    expect(() => validatePushSubscriptionInput("string")).toThrow(
      "Push subscription input must be an object"
    );
  });

  it("throws when endpoint is missing", () => {
    expect(() =>
      validatePushSubscriptionInput({ p256dhKey: "k", authKey: "a" })
    ).toThrow("Push subscription missing required field: endpoint");
  });

  it("throws when endpoint is empty string", () => {
    expect(() =>
      validatePushSubscriptionInput({ endpoint: "", p256dhKey: "k", authKey: "a" })
    ).toThrow("Push subscription missing required field: endpoint");
  });

  it("throws when p256dhKey is missing", () => {
    expect(() =>
      validatePushSubscriptionInput({ endpoint: "https://example.com", authKey: "a" })
    ).toThrow("Push subscription missing required field: p256dhKey");
  });

  it("throws when authKey is missing", () => {
    expect(() =>
      validatePushSubscriptionInput({ endpoint: "https://example.com", p256dhKey: "k" })
    ).toThrow("Push subscription missing required field: authKey");
  });
});

// ─── registerPushSubscription ─────────────────────────────────────────────────

describe("registerPushSubscription", () => {
  it("calls prisma.pushSubscription.upsert with correct args and returns mapped record", async () => {
    mockUpsert.mockResolvedValueOnce(baseRow);

    const result = await registerPushSubscription("user-1", {
      endpoint: baseRow.endpoint,
      p256dhKey: baseRow.p256dhKey,
      authKey: baseRow.authKey,
      userAgent: baseRow.userAgent,
    });

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { userId_endpoint: { userId: "user-1", endpoint: baseRow.endpoint } },
      create: {
        userId: "user-1",
        endpoint: baseRow.endpoint,
        p256dhKey: baseRow.p256dhKey,
        authKey: baseRow.authKey,
        userAgent: baseRow.userAgent,
      },
      update: {
        p256dhKey: baseRow.p256dhKey,
        authKey: baseRow.authKey,
        userAgent: baseRow.userAgent,
      },
    });

    expect(result).toEqual({
      id: "sub-1",
      userId: "user-1",
      endpoint: baseRow.endpoint,
      p256dhKey: baseRow.p256dhKey,
      authKey: baseRow.authKey,
      userAgent: baseRow.userAgent,
      createdAt: "2024-01-01T00:00:00.000Z",
    });
  });

  it("upserts an existing subscription (updates keys)", async () => {
    const updated = { ...baseRow, p256dhKey: "new-p256dh", authKey: "new-auth" };
    mockUpsert.mockResolvedValueOnce(updated);

    const result = await registerPushSubscription("user-1", {
      endpoint: baseRow.endpoint,
      p256dhKey: "new-p256dh",
      authKey: "new-auth",
    });

    expect(result.p256dhKey).toBe("new-p256dh");
    expect(result.authKey).toBe("new-auth");
  });

  it("stores null userAgent when not provided", async () => {
    mockUpsert.mockResolvedValueOnce({ ...baseRow, userAgent: null });

    await registerPushSubscription("user-1", {
      endpoint: baseRow.endpoint,
      p256dhKey: baseRow.p256dhKey,
      authKey: baseRow.authKey,
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ userAgent: null }),
        update: expect.objectContaining({ userAgent: null }),
      })
    );
  });

  it("throws validation error for invalid input", async () => {
    await expect(
      registerPushSubscription("user-1", { endpoint: "", p256dhKey: "k", authKey: "a" })
    ).rejects.toThrow("Push subscription missing required field: endpoint");
  });
});

// ─── unregisterPushSubscription ───────────────────────────────────────────────

describe("unregisterPushSubscription", () => {
  it("calls deleteMany with userId and endpoint", async () => {
    mockDeleteMany.mockResolvedValueOnce({ count: 1 });

    await unregisterPushSubscription("user-1", "https://push.example.com/sub/1");

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", endpoint: "https://push.example.com/sub/1" },
    });
  });

  it("does not throw when no subscription found (count 0)", async () => {
    mockDeleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      unregisterPushSubscription("user-1", "https://nonexistent.example.com")
    ).resolves.toBeUndefined();
  });
});

// ─── sendPushToUser ───────────────────────────────────────────────────────────

describe("sendPushToUser", () => {
  it("sends to all subscriptions and returns correct sent count", async () => {
    const subs = [baseRow, { ...baseRow, id: "sub-2", endpoint: "https://push.example.com/sub/2" }];
    mockFindMany.mockResolvedValueOnce(subs);
    mockSendPush.mockResolvedValue(undefined);

    const result = await sendPushToUser("user-1", { title: "Hello", body: "World" });

    expect(mockSendPush).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ sent: 2, failed: 0 });
  });

  it("returns failed count when sending throws for some subscriptions", async () => {
    const subs = [baseRow, { ...baseRow, id: "sub-2", endpoint: "https://push.example.com/sub/2" }];
    mockFindMany.mockResolvedValueOnce(subs);
    mockSendPush
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Push failed"));

    const result = await sendPushToUser("user-1", { title: "Hello", body: "World" });

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
  });

  it("does not throw when all sends fail", async () => {
    mockFindMany.mockResolvedValueOnce([baseRow]);
    mockSendPush.mockRejectedValueOnce(new Error("Network error"));

    const result = await sendPushToUser("user-1", { title: "Test", body: "Msg" });

    expect(result).toEqual({ sent: 0, failed: 1 });
  });

  it("returns sent:0 failed:0 when user has no subscriptions", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const result = await sendPushToUser("user-1", { title: "Hi", body: "There" });

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it("passes payload to sendPushNotification", async () => {
    mockFindMany.mockResolvedValueOnce([baseRow]);
    mockSendPush.mockResolvedValueOnce(undefined);

    await sendPushToUser("user-1", { title: "Alert", body: "Check this", url: "/dashboard" });

    expect(mockSendPush).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: baseRow.endpoint }),
      { title: "Alert", body: "Check this", url: "/dashboard" }
    );
  });
});

// ─── listPushSubscriptions ────────────────────────────────────────────────────

describe("listPushSubscriptions", () => {
  it("returns mapped records ordered by createdAt desc", async () => {
    const rows = [
      { ...baseRow, id: "sub-2", createdAt: new Date("2024-02-01T00:00:00Z"), updatedAt: new Date() },
      { ...baseRow, id: "sub-1", createdAt: new Date("2024-01-01T00:00:00Z"), updatedAt: new Date() },
    ];
    mockFindMany.mockResolvedValueOnce(rows);

    const result = await listPushSubscriptions("user-1");

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("sub-2");
    expect(result[0].createdAt).toBe("2024-02-01T00:00:00.000Z");
    expect(result[1].id).toBe("sub-1");
  });

  it("returns empty array when user has no subscriptions", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const result = await listPushSubscriptions("user-1");

    expect(result).toEqual([]);
  });

  it("maps userAgent null correctly", async () => {
    mockFindMany.mockResolvedValueOnce([{ ...baseRow, userAgent: null }]);

    const result = await listPushSubscriptions("user-1");

    expect(result[0].userAgent).toBeNull();
  });
});
