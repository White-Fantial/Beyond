import { describe, it, expect } from "vitest";
import { sanitizeObject, sanitizeJsonString, sanitizeJsonValue } from "@/lib/admin/logs/sanitize";

describe("sanitizeObject", () => {
  it("returns primitives as-is", () => {
    expect(sanitizeObject("hello")).toBe("hello");
    expect(sanitizeObject(42)).toBe(42);
    expect(sanitizeObject(true)).toBe(true);
    expect(sanitizeObject(null)).toBeNull();
    expect(sanitizeObject(undefined)).toBeUndefined();
  });

  it("redacts known sensitive keys (exact match)", () => {
    const result = sanitizeObject({
      password: "hunter2",
      username: "admin",
    }) as Record<string, unknown>;

    expect(result.password).toBe("[REDACTED]");
    expect(result.username).toBe("admin");
  });

  it("redacts keys case-insensitively", () => {
    const result = sanitizeObject({
      AccessToken: "tok_abc",
      REFRESHTOKEN: "ref_xyz",
      Token: "t123",
    }) as Record<string, unknown>;

    expect(result.AccessToken).toBe("[REDACTED]");
    expect(result.REFRESHTOKEN).toBe("[REDACTED]");
    expect(result.Token).toBe("[REDACTED]");
  });

  it("redacts keys with underscores and dashes normalised", () => {
    const result = sanitizeObject({
      client_secret: "sec_abc",
      "webhook-secret": "wh_xyz",
      api_key: "key_123",
    }) as Record<string, unknown>;

    expect(result.client_secret).toBe("[REDACTED]");
    expect(result["webhook-secret"]).toBe("[REDACTED]");
    expect(result.api_key).toBe("[REDACTED]");
  });

  it("redacts nested objects recursively", () => {
    const result = sanitizeObject({
      user: {
        name: "Alice",
        passwordHash: "bcrypt$hash",
      },
    }) as Record<string, unknown>;

    const user = result.user as Record<string, unknown>;
    expect(user.name).toBe("Alice");
    expect(user.passwordHash).toBe("[REDACTED]");
  });

  it("redacts sensitive keys inside arrays", () => {
    const result = sanitizeObject([
      { token: "abc", value: 1 },
      { data: "ok" },
    ]) as Array<Record<string, unknown>>;

    expect(result[0].token).toBe("[REDACTED]");
    expect(result[0].value).toBe(1);
    expect(result[1].data).toBe("ok");
  });

  it("handles empty objects and arrays", () => {
    expect(sanitizeObject({})).toEqual({});
    expect(sanitizeObject([])).toEqual([]);
  });

  it("does not mutate the original input", () => {
    const original = { password: "secret", name: "Bob" };
    sanitizeObject(original);
    expect(original.password).toBe("secret");
  });

  it("handles deeply nested structures", () => {
    const result = sanitizeObject({
      level1: {
        level2: {
          level3: {
            signingKey: "sk_live_abc123",
            safe: "visible",
          },
        },
      },
    }) as Record<string, unknown>;

    const l3 = (
      (result.level1 as Record<string, unknown>).level2 as Record<string, unknown>
    ).level3 as Record<string, unknown>;
    expect(l3.signingKey).toBe("[REDACTED]");
    expect(l3.safe).toBe("visible");
  });

  it("leaves non-sensitive object keys intact", () => {
    const result = sanitizeObject({
      orderId: "order-123",
      status: "SUCCESS",
      amount: 5000,
      items: [{ name: "Burger", qty: 2 }],
    }) as Record<string, unknown>;

    expect(result.orderId).toBe("order-123");
    expect(result.status).toBe("SUCCESS");
    expect(result.amount).toBe(5000);
  });

  it("redacts authorization headers", () => {
    const result = sanitizeObject({
      headers: {
        "content-type": "application/json",
        authorization: "Bearer tok_super_secret",
        "x-request-id": "req-123",
      },
    }) as Record<string, unknown>;

    const headers = result.headers as Record<string, unknown>;
    expect(headers.authorization).toBe("[REDACTED]");
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["x-request-id"]).toBe("req-123");
  });

  it("redacts cookie keys", () => {
    const result = sanitizeObject({
      sessionCookie: "ses_abc",
      cookieJar: "jar_xyz",
    }) as Record<string, unknown>;

    expect(result.sessionCookie).toBe("[REDACTED]");
    expect(result.cookieJar).toBe("[REDACTED]");
  });
});

describe("sanitizeJsonString", () => {
  it("returns null for null/undefined input", () => {
    expect(sanitizeJsonString(null)).toBeNull();
    expect(sanitizeJsonString(undefined)).toBeNull();
    expect(sanitizeJsonString("")).toBeNull();
  });

  it("parses and sanitizes a valid JSON string", () => {
    const input = JSON.stringify({ token: "abc", name: "test" });
    const result = sanitizeJsonString(input) as Record<string, unknown>;
    expect(result.token).toBe("[REDACTED]");
    expect(result.name).toBe("test");
  });

  it("returns a placeholder for unparseable input", () => {
    const result = sanitizeJsonString("not json") as Record<string, unknown>;
    expect(result._raw).toBe("[unparseable]");
  });
});

describe("sanitizeJsonValue", () => {
  it("returns null for null/undefined input", () => {
    expect(sanitizeJsonValue(null)).toBeNull();
    expect(sanitizeJsonValue(undefined)).toBeNull();
  });

  it("sanitizes a pre-parsed object", () => {
    const input = { accessToken: "tok", data: "ok" };
    const result = sanitizeJsonValue(input) as Record<string, unknown>;
    expect(result.accessToken).toBe("[REDACTED]");
    expect(result.data).toBe("ok");
  });
});
