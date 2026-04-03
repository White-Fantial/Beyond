import type { Notification } from "@/types/owner-notifications";
import Link from "next/link";

interface Props {
  notifications: Notification[];
  onMarkAllRead?: () => void;
  onClose?: () => void;
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

export default function NotificationDropdown({ notifications, onMarkAllRead, onClose }: Props) {
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="w-80 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">Notifications</span>
        {hasUnread && onMarkAllRead && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400">No notifications</div>
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
                  <p className="text-[10px] text-gray-400 mt-1">{relativeDate(n.createdAt)}</p>
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
          onClick={onClose}
        >
          View all notifications →
        </Link>
      </div>
    </div>
  );
}
