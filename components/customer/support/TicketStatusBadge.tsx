import type { SupportTicketStatus } from "@/types/customer-support";

const COLORS: Record<SupportTicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  WAITING_CUSTOMER: "bg-purple-100 text-purple-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

const LABELS: Record<SupportTicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_CUSTOMER: "Waiting",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function TicketStatusBadge({ status }: { status: SupportTicketStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COLORS[status]}`}>
      {LABELS[status]}
    </span>
  );
}
