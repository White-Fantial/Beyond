"use client";

import { useState, useEffect, useCallback } from "react";
import type { BackofficeLiveOrder, BackofficeLiveOrdersData } from "@/types/backoffice";

const KITCHEN_STATUSES = ["RECEIVED", "IN_PROGRESS"] as const;
type KitchenStatus = (typeof KITCHEN_STATUSES)[number];

const STATUS_LABELS: Record<KitchenStatus, string> = {
  RECEIVED: "New",
  IN_PROGRESS: "Preparing",
};

const STATUS_BG: Record<KitchenStatus, string> = {
  RECEIVED: "bg-blue-500",
  IN_PROGRESS: "bg-yellow-500",
};

const NEXT_ACTION: Record<KitchenStatus, { label: string; next: string } | null> = {
  RECEIVED: { label: "Accept & Start", next: "ACCEPTED" },
  IN_PROGRESS: { label: "Mark Ready", next: "READY" },
};

const CHANNEL_LABELS: Record<string, string> = {
  UBER_EATS: "Uber Eats",
  DOORDASH: "DoorDash",
  POS: "POS",
  ONLINE: "Online",
  SUBSCRIPTION: "Sub",
  MANUAL: "Manual",
  UNKNOWN: "—",
};

function ageLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

interface Props {
  storeId: string;
}

export default function KitchenDisplayClient({ storeId }: Props) {
  const [orders, setOrders] = useState<BackofficeLiveOrder[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/backoffice/${storeId}/orders`);
      if (!res.ok) return;
      const body = (await res.json()) as { data: BackofficeLiveOrdersData };
      const all = body.data?.orders ?? [];
      setOrders(
        all
          .filter((o): o is BackofficeLiveOrder =>
            KITCHEN_STATUSES.includes(o.status as KitchenStatus)
          )
          .sort(
            (a, b) =>
              new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime()
          )
      );
    } catch {
      // swallow
    }
  }, [storeId]);

  useEffect(() => {
    fetchOrders();
    const poll = setInterval(fetchOrders, 15_000);
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [fetchOrders]);

  // Keep age labels fresh every 30s
  const updatedOrders = orders.map((o) => ({
    ...o,
    ageMinutes: Math.floor(
      (now.getTime() - new Date(o.orderedAt).getTime()) / 60_000
    ),
  }));

  async function advance(orderId: string, nextStatus: string) {
    setUpdatingId(orderId);
    try {
      await fetch(`/api/backoffice/${storeId}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await fetchOrders();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">🍳 Kitchen Display</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            {now.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <a
            href={`/backoffice/store/${storeId}/orders`}
            className="text-xs text-gray-400 hover:text-white underline"
          >
            ← Back to Board
          </a>
        </div>
      </div>

      {updatedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-xl font-semibold text-gray-300">All caught up!</p>
          <p className="text-sm text-gray-500 mt-1">No active kitchen orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {updatedOrders.map((order) => {
            const status = order.status as KitchenStatus;
            const action = NEXT_ACTION[status];
            const isUpdating = updatingId === order.id;
            const isUrgent = order.ageMinutes >= 20;

            return (
              <div
                key={order.id}
                className={`rounded-xl border ${
                  isUrgent
                    ? "border-red-500 bg-red-950/40"
                    : "border-gray-700 bg-gray-800"
                } p-4 flex flex-col gap-3`}
              >
                {/* Status badge + age */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold rounded px-2 py-0.5 ${STATUS_BG[status]} text-white`}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      isUrgent ? "text-red-400" : "text-gray-400"
                    }`}
                  >
                    {ageLabel(order.ageMinutes)}
                  </span>
                </div>

                {/* Customer + channel */}
                <div>
                  <p className="text-base font-bold leading-tight">
                    {order.customerName ?? "Guest"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {CHANNEL_LABELS[order.sourceChannel] ?? order.sourceChannel} ·{" "}
                    {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Action button */}
                {action && (
                  <button
                    disabled={isUpdating}
                    onClick={() => advance(order.id, action.next)}
                    className="mt-auto w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                  >
                    {isUpdating ? "…" : action.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
