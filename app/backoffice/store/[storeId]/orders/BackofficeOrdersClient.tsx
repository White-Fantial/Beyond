"use client";

import { useState } from "react";
import type { Order, OrderItem } from "@prisma/client";

type OrderWithItems = Order & { items: OrderItem[] };

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "접수됨",
  ACCEPTED: "수락됨",
  IN_PROGRESS: "준비 중",
  READY: "준비 완료",
  COMPLETED: "완료",
  CANCELLED: "취소됨",
  FAILED: "실패",
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  READY: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  FAILED: "bg-red-100 text-red-700",
};

const CHANNEL_LABELS: Record<string, string> = {
  UBER_EATS: "Uber Eats",
  DOORDASH: "DoorDash",
  POS: "POS",
  ONLINE: "온라인",
  SUBSCRIPTION: "구독",
  MANUAL: "수동",
  UNKNOWN: "알 수 없음",
};

const NEXT_STATUSES: Record<string, string[]> = {
  RECEIVED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: [],
};

interface Props {
  storeId: string;
  initialOrders: OrderWithItems[];
  initialTotal: number;
}

export default function BackofficeOrdersClient({
  storeId,
  initialOrders,
  initialTotal,
}: Props) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const LIMIT = 50;

  async function loadPage(newOffset: number) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders?storeId=${storeId}&limit=${LIMIT}&offset=${newOffset}`
      );
      if (res.ok) {
        const data = (await res.json()) as { orders: OrderWithItems[]; total: number };
        setOrders(data.orders);
        setTotal(data.total);
        setOffset(newOffset);
      }
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(orderId: string, status: string) {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const { order } = (await res.json()) as { order: Order };
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, ...order } : o))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  if (orders.length === 0 && total === 0) {
    return <p className="text-gray-500">현재 진행 중인 주문이 없습니다.</p>;
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">전체 {total}건</p>

      <div className="space-y-3">
        {orders.map((order) => {
          const isExpanded = expandedId === order.id;
          const nextStatuses = NEXT_STATUSES[order.status] ?? [];
          const isUpdating = updatingId === order.id;

          return (
            <div key={order.id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              {/* Header row */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-gray-400 shrink-0">
                    {order.id.slice(0, 8)}
                  </span>
                  <span className="font-medium text-gray-900 truncate">
                    {order.customerName ?? "이름 없음"}
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 shrink-0">
                    {CHANNEL_LABELS[order.sourceChannel] ?? order.sourceChannel}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {(order.totalAmount / 100).toFixed(2)} {order.currencyCode}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(order.orderedAt).toLocaleString("ko-KR", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-gray-400 text-sm">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                  {/* Line items */}
                  {order.items.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">주문 항목</p>
                      <ul className="divide-y divide-gray-50 text-sm">
                        {order.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex justify-between py-1 text-gray-800"
                          >
                            <span>
                              {item.productName}
                              {item.quantity > 1 && (
                                <span className="ml-1 text-gray-400">×{item.quantity}</span>
                              )}
                            </span>
                            <span className="text-gray-600">
                              {(item.totalPriceAmount / 100).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Notes */}
                  {order.notes && (
                    <p className="text-xs text-gray-500 italic">메모: {order.notes}</p>
                  )}

                  {/* Status actions */}
                  {nextStatuses.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {nextStatuses.map((s) => (
                        <button
                          key={s}
                          disabled={isUpdating}
                          onClick={() => changeStatus(order.id, s)}
                          className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {STATUS_LABELS[s] ?? s}으로 변경
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="mt-4 flex items-center gap-3">
          <button
            disabled={offset === 0 || loading}
            onClick={() => loadPage(Math.max(0, offset - LIMIT))}
            className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-sm text-gray-500">
            {offset + 1}–{Math.min(offset + LIMIT, total)} / {total}
          </span>
          <button
            disabled={offset + LIMIT >= total || loading}
            onClick={() => loadPage(offset + LIMIT)}
            className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
