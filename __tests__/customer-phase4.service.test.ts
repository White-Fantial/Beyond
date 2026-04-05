import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productReview: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    supportTicket: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    supportTicketMessage: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listCustomerReviews,
  createCustomerReview,
  deleteCustomerReview,
} from "@/services/customer-reviews.service";
import {
  listCustomerTickets,
  getCustomerTicketDetail,
  createCustomerTicket,
  replyToCustomerTicket,
} from "@/services/customer-support.service";

// ─── Typed mock helpers ───────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  productReview: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  supportTicket: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  supportTicketMessage: {
    create: ReturnType<typeof vi.fn>;
  };
};

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const now = new Date("2025-01-01T00:00:00.000Z");

function makeReviewRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "rev-1",
    tenantId: "tenant-1",
    userId: "user-1",
    productId: null,
    orderId: null,
    rating: 4,
    title: "Great",
    body: "Loved it",
    status: "PENDING",
    moderatedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeTicketRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ticket-1",
    tenantId: "tenant-1",
    userId: "user-1",
    subject: "Help me",
    status: "OPEN",
    priority: "MEDIUM",
    orderId: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeMessageRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "msg-1",
    ticketId: "ticket-1",
    authorId: "user-1",
    body: "Initial message",
    isStaff: false,
    createdAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Reviews ─────────────────────────────────────────────────────────────────

describe("listCustomerReviews", () => {
  it("returns paginated reviews for the user", async () => {
    const row = makeReviewRow();
    mockPrisma.productReview.findMany.mockResolvedValue([row]);
    mockPrisma.productReview.count.mockResolvedValue(1);

    const result = await listCustomerReviews("user-1", { page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("rev-1");
    expect(result.items[0].status).toBe("PENDING");
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("uses default pagination when no options provided", async () => {
    mockPrisma.productReview.findMany.mockResolvedValue([]);
    mockPrisma.productReview.count.mockResolvedValue(0);

    const result = await listCustomerReviews("user-1");

    expect(mockPrisma.productReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 })
    );
    expect(result.items).toHaveLength(0);
  });

  it("serializes dates to ISO strings", async () => {
    mockPrisma.productReview.findMany.mockResolvedValue([makeReviewRow()]);
    mockPrisma.productReview.count.mockResolvedValue(1);

    const result = await listCustomerReviews("user-1");

    expect(result.items[0].createdAt).toBe(now.toISOString());
    expect(result.items[0].updatedAt).toBe(now.toISOString());
    expect(result.items[0].moderatedAt).toBeNull();
  });
});

describe("createCustomerReview", () => {
  it("creates a review with PENDING status", async () => {
    const row = makeReviewRow({ rating: 5, title: "Excellent", body: "Amazing" });
    mockPrisma.productReview.create.mockResolvedValue(row);

    const result = await createCustomerReview("user-1", "tenant-1", {
      rating: 5,
      title: "Excellent",
      body: "Amazing",
    });

    expect(result.status).toBe("PENDING");
    expect(result.rating).toBe(5);
    expect(mockPrisma.productReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING", tenantId: "tenant-1", userId: "user-1" }),
      })
    );
  });

  it("throws when rating is below 1", async () => {
    await expect(
      createCustomerReview("user-1", "tenant-1", { rating: 0 })
    ).rejects.toThrow("Rating must be between 1 and 5");
  });

  it("throws when rating is above 5", async () => {
    await expect(
      createCustomerReview("user-1", "tenant-1", { rating: 6 })
    ).rejects.toThrow("Rating must be between 1 and 5");
  });

  it("stores null for optional fields when not provided", async () => {
    mockPrisma.productReview.create.mockResolvedValue(makeReviewRow());

    await createCustomerReview("user-1", "tenant-1", { rating: 3 });

    expect(mockPrisma.productReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: null, body: null, productId: null, orderId: null }),
      })
    );
  });
});

describe("deleteCustomerReview", () => {
  it("deletes a review owned by the user", async () => {
    mockPrisma.productReview.findUnique.mockResolvedValue(makeReviewRow());
    mockPrisma.productReview.delete.mockResolvedValue({});

    await expect(deleteCustomerReview("user-1", "rev-1")).resolves.toBeUndefined();
    expect(mockPrisma.productReview.delete).toHaveBeenCalledWith({ where: { id: "rev-1" } });
  });

  it("throws when review does not exist", async () => {
    mockPrisma.productReview.findUnique.mockResolvedValue(null);

    await expect(deleteCustomerReview("user-1", "rev-999")).rejects.toThrow("rev-999 not found");
  });

  it("throws when review belongs to another user", async () => {
    mockPrisma.productReview.findUnique.mockResolvedValue(makeReviewRow({ userId: "other-user" }));

    await expect(deleteCustomerReview("user-1", "rev-1")).rejects.toThrow("rev-1 not found");
  });
});

// ─── Support Tickets ──────────────────────────────────────────────────────────

describe("listCustomerTickets", () => {
  it("returns paginated tickets for the user", async () => {
    mockPrisma.supportTicket.findMany.mockResolvedValue([makeTicketRow()]);
    mockPrisma.supportTicket.count.mockResolvedValue(1);

    const result = await listCustomerTickets("user-1", { page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("ticket-1");
    expect(result.items[0].status).toBe("OPEN");
  });

  it("serializes dates to ISO strings", async () => {
    mockPrisma.supportTicket.findMany.mockResolvedValue([makeTicketRow()]);
    mockPrisma.supportTicket.count.mockResolvedValue(1);

    const result = await listCustomerTickets("user-1");

    expect(result.items[0].createdAt).toBe(now.toISOString());
    expect(result.items[0].resolvedAt).toBeNull();
  });
});

describe("getCustomerTicketDetail", () => {
  it("returns ticket with messages for the user", async () => {
    const msg = makeMessageRow();
    mockPrisma.supportTicket.findFirst.mockResolvedValue({ ...makeTicketRow(), messages: [msg] });

    const result = await getCustomerTicketDetail("user-1", "ticket-1");

    expect(result.id).toBe("ticket-1");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].body).toBe("Initial message");
  });

  it("throws when ticket does not exist", async () => {
    mockPrisma.supportTicket.findFirst.mockResolvedValue(null);

    await expect(getCustomerTicketDetail("user-1", "ticket-999")).rejects.toThrow("ticket-999 not found");
  });

  it("throws when ticket belongs to another user (findFirst returns null)", async () => {
    mockPrisma.supportTicket.findFirst.mockResolvedValue(null);

    await expect(getCustomerTicketDetail("user-2", "ticket-1")).rejects.toThrow("not found");
  });
});

describe("createCustomerTicket", () => {
  it("creates ticket with first message and default MEDIUM priority", async () => {
    const msg = makeMessageRow();
    const ticket = { ...makeTicketRow(), messages: [msg] };
    mockPrisma.supportTicket.create.mockResolvedValue(ticket);

    const result = await createCustomerTicket("user-1", "tenant-1", {
      subject: "Help me",
      body: "Initial message",
    });

    expect(result.subject).toBe("Help me");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].body).toBe("Initial message");
    expect(mockPrisma.supportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "OPEN",
          priority: "MEDIUM",
          tenantId: "tenant-1",
        }),
      })
    );
  });

  it("uses provided priority", async () => {
    const msg = makeMessageRow();
    const ticket = { ...makeTicketRow({ priority: "HIGH" }), messages: [msg] };
    mockPrisma.supportTicket.create.mockResolvedValue(ticket);

    const result = await createCustomerTicket("user-1", "tenant-1", {
      subject: "Urgent",
      body: "Very urgent",
      priority: "HIGH",
    });

    expect(result.priority).toBe("HIGH");
  });

  it("sets orderId when provided", async () => {
    const msg = makeMessageRow();
    const ticket = { ...makeTicketRow({ orderId: "order-123" }), messages: [msg] };
    mockPrisma.supportTicket.create.mockResolvedValue(ticket);

    await createCustomerTicket("user-1", "tenant-1", {
      subject: "Order issue",
      body: "My order is missing",
      orderId: "order-123",
    });

    expect(mockPrisma.supportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderId: "order-123" }),
      })
    );
  });
});

describe("replyToCustomerTicket", () => {
  it("creates a message for an open ticket", async () => {
    mockPrisma.supportTicket.findFirst.mockResolvedValue(makeTicketRow());
    mockPrisma.supportTicketMessage.create.mockResolvedValue(makeMessageRow({ body: "My reply" }));

    const result = await replyToCustomerTicket("user-1", "ticket-1", "My reply");

    expect(result.body).toBe("My reply");
    expect(result.isStaff).toBe(false);
  });

  it("throws when replying to a RESOLVED ticket", async () => {
    mockPrisma.supportTicket.findFirst.mockResolvedValue(makeTicketRow({ status: "RESOLVED" }));

    await expect(
      replyToCustomerTicket("user-1", "ticket-1", "Still need help")
    ).rejects.toThrow("Cannot reply to a resolved or closed ticket");
  });

  it("throws when replying to a CLOSED ticket", async () => {
    mockPrisma.supportTicket.findFirst.mockResolvedValue(makeTicketRow({ status: "CLOSED" }));

    await expect(
      replyToCustomerTicket("user-1", "ticket-1", "Hello?")
    ).rejects.toThrow("Cannot reply to a resolved or closed ticket");
  });

  it("throws when ticket does not belong to the user (findFirst returns null)", async () => {
    mockPrisma.supportTicket.findFirst.mockResolvedValue(null);

    await expect(
      replyToCustomerTicket("user-2", "ticket-1", "Trying to reply")
    ).rejects.toThrow("ticket-1 not found");
  });
});
