import type { SupportTicket } from "@/types/customer-support";
import Link from "next/link";
import TicketStatusBadge from "./TicketStatusBadge";

interface Props { tickets: SupportTicket[] }

export default function TicketList({ tickets }: Props) {
  if (tickets.length === 0) {
    return <div className="py-12 text-center text-gray-400 text-sm">No support tickets yet.</div>;
  }

  return (
    <div className="space-y-2">
      {tickets.map((t) => (
        <Link
          key={t.id}
          href={`/app/support/${t.id}`}
          className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 hover:bg-gray-50 transition"
        >
          <div>
            <p className="text-sm font-medium text-gray-900">{t.subject}</p>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(t.createdAt).toLocaleDateString()}</p>
          </div>
          <TicketStatusBadge status={t.status} />
        </Link>
      ))}
    </div>
  );
}
