"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SupportTicketDetail } from "@/types/customer-support";
import TicketStatusBadge from "./TicketStatusBadge";

interface Props { ticket: SupportTicketDetail; userId: string }

export default function TicketThread({ ticket }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canReply = ticket.status !== "RESOLVED" && ticket.status !== "CLOSED";

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/customer/support/${ticket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to send reply");
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Opened {new Date(ticket.createdAt).toLocaleDateString()}</p>
        </div>
        <TicketStatusBadge status={ticket.status} />
      </div>

      <div className="space-y-3">
        {ticket.messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-xl px-4 py-3 text-sm ${msg.isStaff ? "bg-brand-50 border border-brand-100" : "bg-white border border-gray-100"}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-xs text-gray-500">{msg.isStaff ? "Support Team" : "You"}</span>
              <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-gray-700 whitespace-pre-line">{msg.body}</p>
          </div>
        ))}
      </div>

      {canReply && (
        <form onSubmit={handleReply} className="space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Type your reply…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
          />
          <button
            type="submit"
            disabled={isPending || !body.trim()}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {isPending ? "Sending…" : "Send Reply"}
          </button>
        </form>
      )}
    </div>
  );
}
