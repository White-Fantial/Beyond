"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CustomerNotification } from "@/types/customer";

function typeIcon(type: string): string {
  switch (type) {
    case "ORDER_STATUS_UPDATE":
      return "📦";
    case "SUBSCRIPTION_REMINDER":
      return "🔄";
    case "PAYMENT_ISSUE":
      return "💳";
    default:
      return "ℹ️";
  }
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface Props {
  initialItems: CustomerNotification[];
  initialTotal: number;
  initialUnreadCount: number;
}

export default function NotificationList({
  initialItems,
  initialTotal,
  initialUnreadCount,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<CustomerNotification[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const PAGE_SIZE = 20;
  const hasNext = page * PAGE_SIZE < total;
  const hasPrev = page > 1;

  async function fetchPage(newTab: "all" | "unread", newPage: number) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pageSize: String(PAGE_SIZE),
        page: String(newPage),
        ...(newTab === "unread" ? { unreadOnly: "true" } : {}),
      });
      const res = await fetch(`/api/customer/notifications?${params}`);
      const body = await res.json();
      setItems(body.data?.items ?? []);
      setTotal(body.data?.total ?? 0);
      setUnreadCount(body.data?.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }

  function handleTabChange(newTab: "all" | "unread") {
    setTab(newTab);
    setPage(1);
    fetchPage(newTab, 1);
  }

  function handlePage(newPage: number) {
    setPage(newPage);
    fetchPage(tab, newPage);
  }

  async function handleMarkRead(notif: CustomerNotification) {
    if (notif.readAt) return;
    await fetch(`/api/customer/notifications/${notif.id}/read`, { method: "PATCH" });
    setItems((prev) =>
      prev.map((n) =>
        n.id === notif.id ? { ...n, readAt: new Date().toISOString() } : n
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    router.refresh();
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await fetch("/api/customer/notifications/read-all", { method: "POST" });
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-sm text-brand-600 hover:text-brand-800 font-medium disabled:opacity-50 transition"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "unread"] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
              tab === t
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            {t === "all" ? "All" : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-gray-500">
            {tab === "unread" ? "No unread notifications." : "No notifications yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => handleMarkRead(n)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition ${
                !n.readAt
                  ? "border-brand-200 bg-brand-50 hover:bg-brand-100"
                  : "border-gray-100 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5 shrink-0">{typeIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                    {!n.readAt && (
                      <span className="shrink-0 w-2 h-2 rounded-full bg-brand-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{relativeDate(n.createdAt)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(hasPrev || hasNext) && (
        <div className="flex justify-between mt-6">
          {hasPrev ? (
            <button
              onClick={() => handlePage(page - 1)}
              className="text-sm text-brand-600 hover:underline"
            >
              ← Previous
            </button>
          ) : (
            <span />
          )}
          {hasNext && (
            <button
              onClick={() => handlePage(page + 1)}
              className="text-sm text-brand-600 hover:underline"
            >
              Next →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
