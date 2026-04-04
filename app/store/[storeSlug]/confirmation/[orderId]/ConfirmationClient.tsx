"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { GuestOrderStatus } from "@/types/storefront";

const STATUS_CONFIG: Record<
  string,
  { icon: string; label: string; description: string; color: string }
> = {
  RECEIVED: {
    icon: "📋",
    label: "Order Received",
    description: "Your order has been received and is waiting to be accepted.",
    color: "text-blue-600",
  },
  ACCEPTED: {
    icon: "✅",
    label: "Order Accepted",
    description: "Your order has been accepted! The kitchen will start soon.",
    color: "text-indigo-600",
  },
  IN_PROGRESS: {
    icon: "👨‍🍳",
    label: "Being Prepared",
    description: "Your order is being prepared right now.",
    color: "text-yellow-600",
  },
  READY: {
    icon: "🎉",
    label: "Ready for Pickup!",
    description: "Your order is ready! Please collect it at the counter.",
    color: "text-green-600",
  },
  COMPLETED: {
    icon: "🙌",
    label: "Completed",
    description: "Order completed. Enjoy your meal!",
    color: "text-gray-600",
  },
  CANCELLED: {
    icon: "❌",
    label: "Order Cancelled",
    description: "Unfortunately your order was cancelled. Please contact the store.",
    color: "text-red-600",
  },
};

const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "FAILED"];

interface Props {
  storeSlug: string;
  storeName: string;
  orderId: string;
  initialStatus: GuestOrderStatus;
}

export default function ConfirmationClient({
  storeSlug,
  storeName,
  orderId,
  initialStatus,
}: Props) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (TERMINAL_STATUSES.includes(status.status)) return;

    let es: EventSource | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      pollId = setInterval(async () => {
        try {
          const res = await fetch(`/api/store/${storeSlug}/orders/${orderId}`);
          if (!res.ok) return;
          const body = (await res.json()) as { data: GuestOrderStatus };
          if (body.data) {
            setStatus(body.data);
            if (TERMINAL_STATUSES.includes(body.data.status) && pollId !== null) {
              clearInterval(pollId);
            }
          }
        } catch {
          // swallow
        }
      }, 20_000);
    }

    if (typeof EventSource !== "undefined") {
      try {
        es = new EventSource(`/api/sse/store/${storeSlug}/orders/${orderId}`);
        es.addEventListener("order_status", (e) => {
          try {
            const data = JSON.parse(e.data) as GuestOrderStatus;
            setStatus(data);
            if (TERMINAL_STATUSES.includes(data.status)) {
              es?.close();
            }
          } catch {
            // ignore
          }
        });
        es.onerror = () => {
          es?.close();
          es = null;
          startPolling();
        };
      } catch {
        startPolling();
      }
    } else {
      startPolling();
    }

    return () => {
      es?.close();
      if (pollId !== null) clearInterval(pollId);
    };
  }, [storeSlug, orderId, status.status]);

  const config = STATUS_CONFIG[status.status] ?? {
    icon: "🔄",
    label: status.status,
    description: "Processing your order.",
    color: "text-gray-600",
  };

  const estimatedPickup = status.estimatedPickupAt
    ? new Date(status.estimatedPickupAt).toLocaleTimeString("en-NZ", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  const isTerminal = TERMINAL_STATUSES.includes(status.status);

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Status card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
        <div className="text-6xl mb-3">{config.icon}</div>
        <h2 className={`text-xl font-bold mb-2 ${config.color}`}>{config.label}</h2>
        <p className="text-sm text-gray-500">{config.description}</p>

        {estimatedPickup && status.status !== "COMPLETED" && status.status !== "CANCELLED" && (
          <div className="mt-4 inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
            <span className="text-base">🕐</span>
            <span className="text-sm font-semibold text-gray-700">
              Pickup at {estimatedPickup}
            </span>
          </div>
        )}
      </div>

      {/* Order reference */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
        <p className="text-xs text-gray-500 mb-1">Order Reference</p>
        <p className="font-mono text-base font-bold text-gray-900">
          {orderId.slice(0, 8).toUpperCase()}
        </p>
        <p className="text-xs text-gray-400 mt-1">from {storeName}</p>
      </div>

      {/* Polling indicator */}
      {!isTerminal && (
        <p className="text-center text-xs text-gray-400">
          🔄 Status updates automatically every 20 seconds
        </p>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <Link
          href={`/store/${storeSlug}`}
          className="block w-full py-3 bg-brand-600 hover:bg-brand-700 text-white text-center font-semibold rounded-full transition-colors"
        >
          Order Again
        </Link>
        {!isTerminal && (
          <button
            onClick={() => window.location.reload()}
            className="block w-full py-2 text-sm text-center text-gray-500 hover:text-gray-700"
          >
            Refresh Status
          </button>
        )}
      </div>
    </div>
  );
}
