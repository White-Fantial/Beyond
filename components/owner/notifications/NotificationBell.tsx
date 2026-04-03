"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Notification } from "@/types/owner-notifications";

interface BellProps {
  initialUnreadCount?: number;
}

export default function NotificationBell({ initialUnreadCount = 0 }: BellProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/owner/notifications?pageSize=5")
      .then((r) => r.json())
      .then((body) => {
        setNotifications(body.data?.items ?? []);
        setUnreadCount(body.data?.unreadCount ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Subscribe to SSE for live unread count updates
  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    let es: EventSource | null = null;

    function connect() {
      es = new EventSource("/api/sse/owner/notifications");
      es.addEventListener("unread_count", (e) => {
        try {
          const data = JSON.parse(e.data) as { unreadCount: number };
          setUnreadCount(data.unreadCount);
        } catch {
          // ignore
        }
      });
      es.onerror = () => {
        es?.close();
        es = null;
        // Retry after 30s
        setTimeout(connect, 30_000);
      };
    }

    connect();
    return () => { es?.close(); };
  }, []);

  async function markAllRead() {
    await fetch("/api/owner/notifications/read-all", { method: "POST" });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold px-0.5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {loading ? (
                <div className="px-4 py-6 text-center text-xs text-gray-400">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-400">
                  No notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 ${!n.readAt ? "bg-brand-50" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm mt-0.5">{typeIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {relativeDate(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
              <Link
                href="/owner/notifications"
                className="text-xs font-medium text-brand-600 hover:text-brand-800"
                onClick={() => setOpen(false)}
              >
                View all notifications →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function typeIcon(type: string): string {
  switch (type) {
    case "ALERT_TRIGGERED": return "🚨";
    case "BILLING_REMINDER": return "💳";
    case "INTEGRATION_ISSUE": return "🔌";
    case "SUBSCRIPTION_EVENT": return "🔄";
    case "STAFF_ACTIVITY": return "👤";
    default: return "ℹ️";
  }
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-NZ");
}
