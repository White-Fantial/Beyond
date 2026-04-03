import type { CustomerOrderEvent } from "@/types/customer";

const EVENT_LABELS: Record<string, string> = {
  ORDER_RECEIVED: "Order received",
  ORDER_CREATED: "Order created",
  ORDER_UPDATED: "Order updated",
  ORDER_STATUS_CHANGED: "Status changed",
  POS_FORWARD_REQUESTED: "Sent to kitchen",
  POS_FORWARD_SENT: "Kitchen notified",
  POS_FORWARD_ACCEPTED: "Kitchen accepted",
  POS_FORWARD_FAILED: "Kitchen forwarding failed",
  POS_RECONCILED: "Reconciled",
  ORDER_CANCELLED: "Order cancelled",
  RAW_WEBHOOK_RECEIVED: "Webhook received",
  RAW_SYNC_RECEIVED: "Sync received",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NZ", {
    month: "short",
    day: "numeric",
  });
}

interface OrderEventTimelineProps {
  events: CustomerOrderEvent[];
}

export function OrderEventTimeline({ events }: OrderEventTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">No status history available.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 ml-2">
      {events.map((event, idx) => (
        <li key={event.id} className={`ml-4 ${idx < events.length - 1 ? "pb-4" : ""}`}>
          <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-gray-300" />
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-gray-800">
              {EVENT_LABELS[event.eventType] ?? event.eventType}
            </span>
            <span className="text-xs text-gray-400">
              {fmtDate(event.createdAt)} {fmtTime(event.createdAt)}
            </span>
          </div>
          {event.message && (
            <p className="mt-0.5 text-xs text-gray-500">{event.message}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
