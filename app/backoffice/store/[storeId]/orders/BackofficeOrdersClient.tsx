"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  BackofficeLiveOrder,
  BackofficeOrderDetail,
  BackofficeLiveOrdersData,
  BackofficeOrderDetailResponse,
} from "@/types/backoffice";

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 15_000;

const KANBAN_COLUMNS: { status: string; label: string; color: string }[] = [
  { status: "RECEIVED", label: "New", color: "border-blue-400 bg-blue-50" },
  { status: "ACCEPTED", label: "Accepted", color: "border-indigo-400 bg-indigo-50" },
  { status: "IN_PROGRESS", label: "In Preparation", color: "border-yellow-400 bg-yellow-50" },
  { status: "READY", label: "Ready", color: "border-green-400 bg-green-50" },
];

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  READY: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  FAILED: "bg-red-100 text-red-700",
};

const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  RECEIVED: [
    { label: "Accept", next: "ACCEPTED", color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
    { label: "Reject", next: "CANCELLED", color: "bg-red-100 hover:bg-red-200 text-red-700" },
  ],
  ACCEPTED: [
    { label: "Start Prep", next: "IN_PROGRESS", color: "bg-yellow-500 hover:bg-yellow-600 text-white" },
    { label: "Cancel", next: "CANCELLED", color: "bg-red-100 hover:bg-red-200 text-red-700" },
  ],
  IN_PROGRESS: [
    { label: "Mark Ready", next: "READY", color: "bg-green-600 hover:bg-green-700 text-white" },
    { label: "Cancel", next: "CANCELLED", color: "bg-red-100 hover:bg-red-200 text-red-700" },
  ],
  READY: [
    { label: "Complete", next: "COMPLETED", color: "bg-gray-700 hover:bg-gray-800 text-white" },
    { label: "Cancel", next: "CANCELLED", color: "bg-red-100 hover:bg-red-200 text-red-700" },
  ],
};

const CHANNEL_LABELS: Record<string, string> = {
  UBER_EATS: "Uber Eats",
  DOORDASH: "DoorDash",
  POS: "POS",
  ONLINE: "Online",
  SUBSCRIPTION: "Subscription",
  MANUAL: "Manual",
  UNKNOWN: "Unknown",
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function ageLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface OrderCardProps {
  order: BackofficeLiveOrder;
  onSelect: (id: string) => void;
  onAction: (orderId: string, nextStatus: string) => void;
  updating: boolean;
}

function OrderCard({ order, onSelect, onAction, updating }: OrderCardProps) {
  const actions = STATUS_ACTIONS[order.status] ?? [];
  const isUrgent = order.ageMinutes >= 20;

  return (
    <div
      className={`bg-white rounded-lg border ${isUrgent ? "border-red-300" : "border-gray-200"} shadow-sm`}
    >
      <button
        className="w-full text-left px-3 py-2.5 space-y-1"
        onClick={() => onSelect(order.id)}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-gray-400">{order.id.slice(0, 8)}</span>
          <span
            className={`text-xs font-semibold ${isUrgent ? "text-red-600" : "text-gray-400"}`}
          >
            {ageLabel(order.ageMinutes)}
          </span>
        </div>
        <div className="text-sm font-semibold text-gray-900 truncate">
          {order.customerName ?? "Guest"}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="rounded bg-gray-100 px-1.5 py-0.5">
            {CHANNEL_LABELS[order.sourceChannel] ?? order.sourceChannel}
          </span>
          <span>{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</span>
          <span className="ml-auto font-semibold text-gray-700">
            {formatPrice(order.totalAmount)}
          </span>
        </div>
      </button>

      {actions.length > 0 && (
        <div className="px-3 pb-2.5 flex gap-1.5">
          {actions.map((a) => (
            <button
              key={a.next}
              disabled={updating}
              onClick={(e) => {
                e.stopPropagation();
                onAction(order.id, a.next);
              }}
              className={`flex-1 rounded px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${a.color}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Order Detail Drawer ──────────────────────────────────────────────────────

interface DrawerProps {
  orderId: string;
  storeId: string;
  onClose: () => void;
  onAction: (orderId: string, nextStatus: string) => void;
  updatingId: string | null;
}

function OrderDetailDrawer({ orderId, storeId, onClose, onAction, updatingId }: DrawerProps) {
  const [detail, setDetail] = useState<BackofficeOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/backoffice/${storeId}/orders/${orderId}`)
      .then((r) => r.json())
      .then((body: BackofficeOrderDetailResponse) => setDetail(body.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId, storeId]);

  const actions = detail ? (STATUS_ACTIONS[detail.status] ?? []) : [];
  const isUpdating = updatingId === orderId;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-30"
        onClick={onClose}
      />

      {/* Slide-over */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Order Detail</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-gray-400">Loading…</span>
          </div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-red-500">Order not found</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Meta */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    STATUS_COLORS[detail.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {detail.status}
                </span>
                <span className="text-xs text-gray-400 font-mono">{detail.id.slice(0, 8)}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {ageLabel(detail.ageMinutes)} ago
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {detail.customerName ?? "Guest"}
              </div>
              {detail.customerPhone && (
                <div className="text-xs text-gray-500">{detail.customerPhone}</div>
              )}
              {detail.customerEmail && (
                <div className="text-xs text-gray-500">{detail.customerEmail}</div>
              )}
              <div className="text-xs text-gray-500">
                {CHANNEL_LABELS[detail.sourceChannel] ?? detail.sourceChannel} ·{" "}
                {new Date(detail.orderedAt).toLocaleString("en-NZ", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Items
              </p>
              <ul className="divide-y divide-gray-50 text-sm">
                {detail.items.map((item) => (
                  <li key={item.id} className="py-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900">
                        {item.productName}
                        {item.quantity > 1 && (
                          <span className="ml-1 text-gray-400 font-normal">
                            ×{item.quantity}
                          </span>
                        )}
                      </span>
                      <span className="text-gray-700">
                        {formatPrice(item.totalPriceAmount)}
                      </span>
                    </div>
                    {item.modifiers.length > 0 && (
                      <ul className="mt-0.5 space-y-0.5">
                        {item.modifiers.map((m, idx) => (
                          <li key={idx} className="flex justify-between text-xs text-gray-500 pl-2">
                            <span>+ {m.modifierOptionName}</span>
                            {m.unitPriceAmount > 0 && (
                              <span>{formatPrice(m.unitPriceAmount)}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.notes && (
                      <p className="mt-0.5 text-xs text-gray-400 italic pl-2">
                        Note: {item.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
              {detail.discountAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount</span>
                  <span>−{formatPrice(detail.discountAmount)}</span>
                </div>
              )}
              {detail.taxAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>{formatPrice(detail.taxAmount)}</span>
                </div>
              )}
              {detail.tipAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tip</span>
                  <span>{formatPrice(detail.tipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1 mt-1">
                <span>Total</span>
                <span>{formatPrice(detail.totalAmount)}</span>
              </div>
            </div>

            {/* Order notes */}
            {detail.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                <span className="font-semibold">Note: </span>
                {detail.notes}
              </div>
            )}

            {/* Event timeline */}
            {detail.events.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Timeline
                </p>
                <ol className="relative border-l border-gray-200 ml-2 space-y-3">
                  {detail.events.map((e) => (
                    <li key={e.id} className="ml-4">
                      <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-gray-300 border border-white" />
                      <p className="text-xs font-medium text-gray-700">{e.eventType}</p>
                      {e.message && (
                        <p className="text-xs text-gray-500">{e.message}</p>
                      )}
                      <p className="text-[10px] text-gray-400">
                        {new Date(e.createdAt).toLocaleString("en-NZ", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Action footer */}
        {detail && actions.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
            {actions.map((a) => (
              <button
                key={a.next}
                disabled={isUpdating}
                onClick={() => onAction(detail.id, a.next)}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${a.color}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── New-order Toast ──────────────────────────────────────────────────────────

function NewOrderToast({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-lg">
      <span className="text-base">🔔</span>
      <span className="text-sm font-semibold">
        {count} new order{count !== 1 ? "s" : ""}
      </span>
      <button
        onClick={onDismiss}
        className="ml-2 text-blue-200 hover:text-white text-sm"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  storeId: string;
}

export default function BackofficeOrdersClient({ storeId }: Props) {
  const [orders, setOrders] = useState<BackofficeLiveOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newOrderCount, setNewOrderCount] = useState(0);
  // Initialized to -1 so the first load sets the baseline without triggering a toast.
  const prevCountRef = useRef(-1);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/backoffice/${storeId}/orders`);
      if (!res.ok) return;
      const body = (await res.json()) as { data: BackofficeLiveOrdersData };
      const incoming = body.data?.orders ?? [];
      setOrders(incoming);

      const prev = prevCountRef.current;
      const next = incoming.filter((o) => o.status === "RECEIVED").length;
      // Show toast when new RECEIVED orders arrive after the initial baseline is set.
      if (next > prev && prev >= 0) {
        setNewOrderCount(next - prev);
      }
      prevCountRef.current = next;
    } catch {
      // swallow network errors silently
    }
  }, [storeId]);

  // SSE with polling fallback
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      fetchOrders();
      pollId = setInterval(fetchOrders, POLL_INTERVAL_MS);
    }

    if (typeof window !== "undefined" && typeof EventSource !== "undefined") {
      try {
        eventSource = new EventSource(`/api/sse/store/${storeId}/orders`);

        eventSource.addEventListener("orders_snapshot", (e) => {
          try {
            const body = JSON.parse(e.data) as BackofficeLiveOrdersData;
            const incoming = body.orders ?? [];
            setOrders(incoming);
            const prev = prevCountRef.current;
            const next = incoming.filter((o) => o.status === "RECEIVED").length;
            if (next > prev && prev >= 0) setNewOrderCount(next - prev);
            prevCountRef.current = next;
          } catch {
            // ignore parse errors
          }
        });

        eventSource.addEventListener("orders_update", (e) => {
          try {
            const body = JSON.parse(e.data) as BackofficeLiveOrdersData;
            const incoming = body.orders ?? [];
            setOrders(incoming);
            const prev = prevCountRef.current;
            const next = incoming.filter((o) => o.status === "RECEIVED").length;
            if (next > prev && prev >= 0) setNewOrderCount(next - prev);
            prevCountRef.current = next;
          } catch {
            // ignore parse errors
          }
        });

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          startPolling();
        };
      } catch {
        startPolling();
      }
    } else {
      startPolling();
    }

    return () => {
      eventSource?.close();
      if (pollId !== null) clearInterval(pollId);
    };
  }, [storeId, fetchOrders]);

  const handleAction = useCallback(
    async (orderId: string, nextStatus: string) => {
      setUpdatingId(orderId);
      try {
        const res = await fetch(
          `/api/backoffice/${storeId}/orders/${orderId}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
          }
        );
        if (res.ok) {
          await fetchOrders();
          if (selectedId === orderId && ["COMPLETED", "CANCELLED"].includes(nextStatus)) {
            setSelectedId(null);
          }
        }
      } finally {
        setUpdatingId(null);
      }
    },
    [storeId, fetchOrders, selectedId]
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const ordersByStatus = Object.fromEntries(
    KANBAN_COLUMNS.map((col) => [
      col.status,
      orders.filter((o) => o.status === col.status),
    ])
  );

  return (
    <div className="space-y-4">
      {/* New order toast */}
      {newOrderCount > 0 && (
        <NewOrderToast
          count={newOrderCount}
          onDismiss={() => setNewOrderCount(0)}
        />
      )}

      {/* Summary strip */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {orders.length} active order{orders.length !== 1 ? "s" : ""}
        </p>
        <a
          href={`/backoffice/store/${storeId}/orders/kitchen`}
          className="text-xs text-brand-600 hover:text-brand-800 font-medium"
        >
          Kitchen Display →
        </a>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-2">🍽️</div>
          <p className="text-sm">No active orders right now</p>
        </div>
      ) : (
        /* Kanban grid */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colOrders = ordersByStatus[col.status] ?? [];
            return (
              <div key={col.status} className={`rounded-xl border-2 ${col.color} p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    {col.label}
                  </span>
                  <span className="text-xs font-semibold bg-white rounded-full px-2 py-0.5 border border-gray-200 text-gray-600">
                    {colOrders.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onSelect={handleSelect}
                      onAction={handleAction}
                      updating={updatingId === order.id}
                    />
                  ))}
                  {colOrders.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4">Empty</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order detail drawer */}
      {selectedId && (
        <OrderDetailDrawer
          orderId={selectedId}
          storeId={storeId}
          onClose={() => setSelectedId(null)}
          onAction={handleAction}
          updatingId={updatingId}
        />
      )}
    </div>
  );
}
