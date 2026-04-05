/**
 * Customer Support Service — Phase 4.
 * Manages support tickets and messages, scoped to userId.
 */
import { prisma } from "@/lib/prisma";
import type {
  SupportTicket,
  SupportTicketDetail,
  SupportTicketMessage,
  TicketListResult,
  CreateTicketInput,
  SupportTicketStatus,
  SupportTicketPriority,
} from "@/types/customer-support";

function toTicket(row: {
  id: string;
  tenantId: string;
  userId: string;
  subject: string;
  status: string;
  priority: string;
  orderId: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): SupportTicket {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    subject: row.subject,
    status: row.status as SupportTicketStatus,
    priority: row.priority as SupportTicketPriority,
    orderId: row.orderId,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessage(row: {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  isStaff: boolean;
  createdAt: Date;
}): SupportTicketMessage {
  return {
    id: row.id,
    ticketId: row.ticketId,
    authorId: row.authorId,
    body: row.body,
    isStaff: row.isStaff,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCustomerTickets(
  userId: string,
  opts: { page?: number; pageSize?: number } = {}
): Promise<TicketListResult> {
  const { page = 1, pageSize = 20 } = opts;
  const where = { userId };
  const [rows, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supportTicket.count({ where }),
  ]);
  return { items: rows.map(toTicket), total, page, pageSize };
}

export async function getCustomerTicketDetail(
  userId: string,
  ticketId: string
): Promise<SupportTicketDetail> {
  const row = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!row) throw new Error(`Ticket ${ticketId} not found`);
  return {
    ...toTicket(row),
    messages: row.messages.map(toMessage),
  };
}

export async function createCustomerTicket(
  userId: string,
  tenantId: string,
  input: CreateTicketInput
): Promise<SupportTicketDetail> {
  const ticket = await prisma.supportTicket.create({
    data: {
      tenantId,
      userId,
      subject: input.subject,
      status: "OPEN",
      priority: input.priority ?? "MEDIUM",
      orderId: input.orderId ?? null,
      messages: {
        create: {
          authorId: userId,
          body: input.body,
          isStaff: false,
        },
      },
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  return {
    ...toTicket(ticket),
    messages: ticket.messages.map(toMessage),
  };
}

export async function replyToCustomerTicket(
  userId: string,
  ticketId: string,
  body: string
): Promise<SupportTicketMessage> {
  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, userId } });
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
    throw new Error("Cannot reply to a resolved or closed ticket");
  }
  const msg = await prisma.supportTicketMessage.create({
    data: { ticketId, authorId: userId, body, isStaff: false },
  });
  return toMessage(msg);
}
