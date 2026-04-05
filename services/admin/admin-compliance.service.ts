/**
 * Admin Compliance Service — Phase E (GDPR & Compliance Tools).
 *
 * Provides GDPR data export, right-to-erasure, and retention reporting.
 * All functions require platform admin access (enforced at the route layer).
 */
import { prisma } from "@/lib/prisma";

export interface UserDataExport {
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    createdAt: string;
  };
  orders: Array<{
    id: string;
    status: string;
    totalAmount: number;
    createdAt: string;
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    startDate: string;
  }>;
  addresses: Array<{
    id: string;
    line1: string;
    city: string;
    country: string;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
  reviews: Array<{
    id: string;
    productId: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
  supportTickets: Array<{
    id: string;
    subject: string;
    status: string;
    createdAt: string;
  }>;
  loyaltyAccount: {
    points: number;
    tier: string;
  } | null;
  exportedAt: string;
}

export async function exportUserData(userId: string): Promise<UserDataExport> {
  const [user, orders, subscriptions, addresses, notifications, reviews, tickets, loyalty] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, phone: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: { customerEmail: { not: null } },
        select: { id: true, status: true, totalAmount: true, createdAt: true, customerEmail: true },
      }).then((rows) =>
        rows.filter((r) => {
          // best-effort: match by userId's email (denormalized on order)
          return true; // included so query works — filter at caller layer if needed
        })
      ),
      prisma.subscription.findMany({
        where: { customerEmail: { not: null } },
        select: { id: true, status: true, startDate: true, customerEmail: true },
      }),
      prisma.customerAddress.findMany({
        where: { userId },
        select: { id: true, line1: true, city: true, country: true },
      }),
      prisma.customerNotification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: { id: true, type: true, message: true, createdAt: true },
      }),
      prisma.productReview.findMany({
        where: { userId },
        select: { id: true, productId: true, rating: true, comment: true, createdAt: true },
      }),
      prisma.supportTicket.findMany({
        where: { userId },
        select: { id: true, subject: true, status: true, createdAt: true },
      }),
      prisma.loyaltyAccount.findUnique({
        where: { userId },
        select: { points: true, tier: true },
      }),
    ]);

  if (!user) throw new Error(`User ${userId} not found`);

  // Match orders/subscriptions by user email (denormalized model)
  const userEmail = user.email;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      createdAt: user.createdAt.toISOString(),
    },
    orders: orders
      .filter((o) => o.customerEmail === userEmail)
      .map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: o.totalAmount,
        createdAt: o.createdAt.toISOString(),
      })),
    subscriptions: subscriptions
      .filter((s) => s.customerEmail === userEmail)
      .map((s) => ({
        id: s.id,
        status: s.status,
        startDate: s.startDate.toISOString(),
      })),
    addresses: addresses.map((a) => ({
      id: a.id,
      line1: a.line1,
      city: a.city,
      country: a.country,
    })),
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      createdAt: n.createdAt.toISOString(),
    })),
    reviews: reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    })),
    supportTickets: tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
    loyaltyAccount: loyalty
      ? { points: loyalty.points, tier: loyalty.tier }
      : null,
    exportedAt: new Date().toISOString(),
  };
}

export interface AnonymiseResult {
  userId: string;
  anonymisedAt: string;
}

export async function anonymiseUser(
  userId: string,
  performedBy: string
): Promise<AnonymiseResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(`User ${userId} not found`);

  const anonymisedEmail = `deleted-${userId}@anon.beyond`;
  const anonymisedName = "Deleted User";

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymisedEmail,
        name: anonymisedName,
        phone: null,
        passwordHash: null,
        authProviderUserId: null,
      },
    }),
    prisma.customerAddress.deleteMany({ where: { userId } }),
    prisma.complianceEvent.create({
      data: {
        userId,
        type: "ERASURE_COMPLETE",
        performedBy,
        metadata: { originalEmail: user.email, anonymisedAt: new Date().toISOString() },
      },
    }),
  ]);

  return { userId, anonymisedAt: new Date().toISOString() };
}

export interface RetentionRecord {
  id: string;
  type: string;
  createdAt: string;
}

export interface RetentionReport {
  thresholdDays: number;
  records: RetentionRecord[];
  total: number;
}

export async function getRetentionReport(thresholdDays = 365): Promise<RetentionReport> {
  const threshold = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

  const [auditLogs, orderEvents] = await Promise.all([
    prisma.auditLog.findMany({
      where: { createdAt: { lt: threshold } },
      select: { id: true, createdAt: true, action: true },
      orderBy: { createdAt: "asc" },
      take: 500,
    }),
    prisma.orderEvent.findMany({
      where: { createdAt: { lt: threshold } },
      select: { id: true, createdAt: true, eventType: true },
      orderBy: { createdAt: "asc" },
      take: 500,
    }),
  ]);

  const records: RetentionRecord[] = [
    ...auditLogs.map((r) => ({ id: r.id, type: `AuditLog:${r.action}`, createdAt: r.createdAt.toISOString() })),
    ...orderEvents.map((r) => ({ id: r.id, type: `OrderEvent:${r.eventType}`, createdAt: r.createdAt.toISOString() })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return { thresholdDays, records, total: records.length };
}
