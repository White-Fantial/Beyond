import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailLog: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { sendEmail, setEmailAdapter } from "@/lib/email/send";
import { renderOrderConfirmationEmail } from "@/lib/email/order-confirmation";
import { renderSubscriptionNoticeEmail } from "@/lib/email/subscription-notice";
import { renderAlertDigestEmail } from "@/lib/email/alert-digest";
import { renderEmailHtml, escapeHtml } from "@/lib/email/renderer";

const mockPrisma = prisma as unknown as {
  emailLog: { create: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.emailLog.create.mockResolvedValue({});
});

// ─── renderer ────────────────────────────────────────────────────────────────

describe("renderEmailHtml", () => {
  it("returns valid HTML string", () => {
    const html = renderEmailHtml("Test", "<p>Hello</p>");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<p>Hello</p>");
    expect(html).toContain("Beyond");
  });

  it("includes the title in head", () => {
    const html = renderEmailHtml("My Subject", "<p>body</p>");
    expect(html).toContain("My Subject");
  });
});

describe("escapeHtml", () => {
  it("escapes &", () => expect(escapeHtml("a & b")).toBe("a &amp; b"));
  it("escapes <", () => expect(escapeHtml("<script>")).toBe("&lt;script&gt;"));
  it("escapes quotes", () => expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;"));
  it("leaves safe strings unchanged", () => expect(escapeHtml("Hello World")).toBe("Hello World"));
});

// ─── order-confirmation ───────────────────────────────────────────────────────

describe("renderOrderConfirmationEmail", () => {
  const data = {
    orderId: "order-abc-123",
    customerName: "Alice",
    storeName: "Bean Scene",
    items: [{ name: "Latte", quantity: 2, unitPrice: 500, total: 1000 }],
    totalAmount: 1000,
    estimatedPickupAt: "2026-04-05T10:00:00Z",
    currencyCode: "NZD",
  };

  it("returns a subject and html", () => {
    const { subject, html } = renderOrderConfirmationEmail(data);
    expect(subject).toContain("Order Confirmed");
    expect(subject).toContain("Bean Scene");
    expect(html).toContain("Alice");
    expect(html).toContain("Latte");
  });

  it("includes discount row when discountApplied > 0", () => {
    const { html } = renderOrderConfirmationEmail({ ...data, discountApplied: 200 });
    expect(html).toContain("Discount applied");
  });

  it("includes loyalty points note when earned > 0", () => {
    const { html } = renderOrderConfirmationEmail({ ...data, loyaltyPointsEarned: 10 });
    expect(html).toContain("10 loyalty points");
  });

  it("does not include discount row when no discount", () => {
    const { html } = renderOrderConfirmationEmail(data);
    expect(html).not.toContain("Discount applied");
  });

  it("escapes XSS in customer name", () => {
    const { html } = renderOrderConfirmationEmail({ ...data, customerName: '<script>alert("xss")</script>' });
    expect(html).not.toContain("<script>");
  });
});

// ─── subscription-notice ─────────────────────────────────────────────────────

describe("renderSubscriptionNoticeEmail", () => {
  const base = {
    customerName: "Bob",
    storeName: "Bean Scene",
    subscriptionId: "sub-1",
    amount: 2000,
    currencyCode: "NZD",
  };

  it("INVOICE_PAID — subject and success message", () => {
    const { subject, html } = renderSubscriptionNoticeEmail({ ...base, type: "INVOICE_PAID" });
    expect(subject).toContain("Payment Confirmed");
    expect(html).toContain("successful");
  });

  it("INVOICE_FAILED — includes failure headline", () => {
    const { html } = renderSubscriptionNoticeEmail({ ...base, type: "INVOICE_FAILED" });
    expect(html).toContain("couldn't process");
  });

  it("SUBSCRIPTION_CANCELLED — correct headline", () => {
    const { html } = renderSubscriptionNoticeEmail({ ...base, type: "SUBSCRIPTION_CANCELLED" });
    expect(html).toContain("cancelled");
  });

  it("includes amount when provided", () => {
    const { html } = renderSubscriptionNoticeEmail({ ...base, type: "INVOICE_PAID" });
    expect(html).toContain("$20.00");
  });

  it("includes reason when provided", () => {
    const { html } = renderSubscriptionNoticeEmail({ ...base, type: "INVOICE_FAILED", reason: "Card declined" });
    expect(html).toContain("Card declined");
  });
});

// ─── alert-digest ────────────────────────────────────────────────────────────

describe("renderAlertDigestEmail", () => {
  const data = {
    recipientName: "Carol",
    storeName: "Bean Scene",
    tenantId: "tenant-1",
    periodLabel: "Daily",
    alerts: [
      { ruleName: "Low Stock", message: "Coffee below threshold", severity: "HIGH", triggeredAt: "2026-04-05 09:00" },
    ],
  };

  it("includes alert count and rule name", () => {
    const { html } = renderAlertDigestEmail(data);
    expect(html).toContain("Low Stock");
    expect(html).toContain("1 alert");
  });

  it("subject contains store name and period", () => {
    const { subject } = renderAlertDigestEmail(data);
    expect(subject).toContain("Bean Scene");
    expect(subject).toContain("Daily");
  });

  it("handles multiple alerts", () => {
    const { html } = renderAlertDigestEmail({
      ...data,
      alerts: [
        ...data.alerts,
        { ruleName: "High Revenue", message: "Revenue spike", severity: "LOW", triggeredAt: "2026-04-05 10:00" },
      ],
    });
    expect(html).toContain("2 alerts");
  });
});

// ─── sendEmail ────────────────────────────────────────────────────────────────

describe("sendEmail", () => {
  it("logs SENT status on success", async () => {
    setEmailAdapter({ send: vi.fn().mockResolvedValue({ providerId: "email-123" }) });

    await sendEmail({ to: "alice@example.com", subject: "Test", html: "<p>hi</p>", template: "test" });

    expect(mockPrisma.emailLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SENT", to: "alice@example.com" }) })
    );
  });

  it("logs FAILED status when adapter throws", async () => {
    setEmailAdapter({ send: vi.fn().mockRejectedValue(new Error("Network timeout")) });

    await sendEmail({ to: "bob@example.com", subject: "Test", html: "<p>hi</p>", template: "test" });

    expect(mockPrisma.emailLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", errorMessage: "Network timeout" }) })
    );
  });

  it("stores providerId in log", async () => {
    setEmailAdapter({ send: vi.fn().mockResolvedValue({ providerId: "res-abc" }) });

    await sendEmail({ to: "carol@example.com", subject: "Test", html: "<p>hi</p>", template: "test" });

    expect(mockPrisma.emailLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ providerId: "res-abc" }) })
    );
  });

  it("always creates an EmailLog even on adapter failure", async () => {
    setEmailAdapter({ send: vi.fn().mockRejectedValue(new Error("fail")) });

    await sendEmail({ to: "x@example.com", subject: "s", html: "<p>h</p>", template: "t" });

    expect(mockPrisma.emailLog.create).toHaveBeenCalledTimes(1);
  });
});
