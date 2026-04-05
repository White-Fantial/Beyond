export type SupportTicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED";
export type SupportTicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  userId: string;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  orderId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketDetail extends SupportTicket {
  messages: SupportTicketMessage[];
}

export interface CreateTicketInput {
  subject: string;
  body: string;
  orderId?: string;
  priority?: SupportTicketPriority;
}

export interface TicketListResult {
  items: SupportTicket[];
  total: number;
  page: number;
  pageSize: number;
}
