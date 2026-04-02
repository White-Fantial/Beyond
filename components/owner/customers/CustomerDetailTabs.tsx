"use client";

import { useState, useTransition } from "react";
import type {
  OwnerCustomerDetail,
  OwnerCustomerOrderRow,
  OwnerCustomerSubscriptionRow,
} from "@/types/owner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(minorUnits: number) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
  }).format(minorUnits / 100);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NZ");
}

// ─── Badges ──────────────────────────────────────────────────────────────────

const CHANNEL_BADGE: Record<string, string> = {
  ONLINE: "bg-blue-100 text-blue-700",
  SUBSCRIPTION: "bg-purple-100 text-purple-700",
  POS: "bg-gray-100 text-gray-600",
  UBER_EATS: "bg-green-100 text-green-700",
  DOORDASH: "bg-red-100 text-red-700",
};

const ORDER_STATUS_BADGE: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-gray-100 text-gray-600",
  ACCEPTED: "bg-yellow-100 text-yellow-700",
};

const SUB_STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function Badge({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        className ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {text}
    </span>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = "overview" | "orders" | "subscriptions" | "notes";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "orders", label: "Orders" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "notes", label: "Notes" },
];

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ detail }: { detail: OwnerCustomerDetail }) {
  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Lifetime Revenue", value: fmt(detail.lifetimeRevenueMinorUnit) },
          { label: "Total Orders", value: detail.totalOrders.toLocaleString() },
          { label: "Active Subscriptions", value: detail.activeSubscriptionCount.toLocaleString() },
          { label: "Last Order", value: fmtDate(detail.lastOrderAt) },
          { label: "First Order", value: fmtDate(detail.firstOrderAt) },
          { label: "Orders (Last 30d)", value: detail.recent30dOrderCount.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Store Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <h3 className="text-xs font-semibold text-gray-600">Store Breakdown</h3>
          </div>
          {detail.storeBreakdown.length === 0 ? (
            <p className="px-4 py-4 text-xs text-gray-400">No data.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Store</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Orders</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {detail.storeBreakdown.map((row) => (
                  <tr key={row.storeId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{row.storeName}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-600">{row.orderCount}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-900">{fmt(row.revenueMinorUnit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Channel Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <h3 className="text-xs font-semibold text-gray-600">Channel Breakdown</h3>
          </div>
          {detail.channelBreakdown.length === 0 ? (
            <p className="px-4 py-4 text-xs text-gray-400">No data.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Channel</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Orders</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {detail.channelBreakdown.map((row) => (
                  <tr key={row.channel} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Badge
                        text={row.channel}
                        className={CHANNEL_BADGE[row.channel] ?? "bg-gray-100 text-gray-600"}
                      />
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-600">{row.orderCount}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-900">{fmt(row.revenueMinorUnit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────

function OrdersTab({ orders }: { orders: OwnerCustomerOrderRow[] }) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
        <p className="text-sm text-gray-400">No orders found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Order ID</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Store</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Channel</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Amount</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {order.id.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 text-gray-700 text-xs">{order.storeName}</td>
                <td className="px-4 py-3">
                  <Badge
                    text={order.sourceChannel}
                    className={CHANNEL_BADGE[order.sourceChannel] ?? "bg-gray-100 text-gray-600"}
                  />
                </td>
                <td className="px-4 py-3">
                  <Badge
                    text={order.status}
                    className={ORDER_STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-600"}
                  />
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                  {fmt(order.totalAmountMinorUnit)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {fmtDate(order.orderedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Generic Confirm Dialog ───────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmClassName,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClassName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-6 w-full max-w-sm mx-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-50"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-3 py-1.5 text-sm rounded disabled:opacity-50 ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cancel Confirm Dialog ─────────────────────────────────────────────────────

function CancelConfirmDialog({
  planName,
  onConfirm,
  onCancel,
  loading,
}: {
  planName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-6 w-full max-w-sm mx-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Cancel Subscription</h3>
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to cancel <span className="font-medium">{planName}</span>? This
          action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-50"
          >
            Keep Subscription
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Cancelling…" : "Cancel Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Next Date Dialog ────────────────────────────────────────────────────

function EditNextDateDialog({
  current,
  onSave,
  onCancel,
  loading,
}: {
  current: string | null;
  onSave: (date: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [value, setValue] = useState(
    current ? current.slice(0, 10) : ""
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-6 w-full max-w-sm mx-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Edit Next Billing Date</h3>
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500 mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => value && onSave(value)}
            disabled={loading || !value}
            className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Note Dialog ─────────────────────────────────────────────────────────

function EditNoteDialog({
  current,
  onSave,
  onCancel,
  loading,
}: {
  current: string | null;
  onSave: (note: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [value, setValue] = useState(current ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-6 w-full max-w-sm mx-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Edit Internal Note</h3>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500 mb-4 resize-none"
          placeholder="Internal note…"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(value)}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Subscription Card ────────────────────────────────────────────────────────

type DialogState =
  | { type: "pause" }
  | { type: "resume" }
  | { type: "cancel" }
  | { type: "editDate" }
  | { type: "editNote" }
  | null;

function SubscriptionCard({ sub }: { sub: OwnerCustomerSubscriptionRow }) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const statusClass = SUB_STATUS_BADGE[sub.status] ?? "bg-gray-100 text-gray-600";

  async function callAction(url: string, method: "POST" | "PATCH", body?: object) {
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    }
  }

  function handlePause() {
    setDialog({ type: "pause" });
  }

  function handleResume() {
    setDialog({ type: "resume" });
  }

  function handleCancel() {
    startTransition(() => {
      callAction(`/api/owner/subscriptions/${sub.id}/cancel`, "POST");
    });
  }

  function handleSaveDate(date: string) {
    startTransition(() => {
      callAction(`/api/owner/subscriptions/${sub.id}/next-date`, "PATCH", { nextDate: date });
    });
    setDialog(null);
  }

  function handleSaveNote(note: string) {
    startTransition(() => {
      callAction(`/api/owner/subscriptions/${sub.id}/note`, "PATCH", { note });
    });
    setDialog(null);
  }

  return (
    <>
      {dialog?.type === "pause" && (
        <ConfirmDialog
          title="Pause Subscription"
          message={`Pause subscription "${sub.planName}"? The customer will not be billed until it is resumed.`}
          confirmLabel={isPending ? "Pausing…" : "Pause"}
          confirmClassName="bg-yellow-600 text-white hover:bg-yellow-700"
          onConfirm={() => {
            setDialog(null);
            startTransition(() => {
              callAction(`/api/owner/subscriptions/${sub.id}/pause`, "POST");
            });
          }}
          onCancel={() => setDialog(null)}
          loading={isPending}
        />
      )}
      {dialog?.type === "resume" && (
        <ConfirmDialog
          title="Resume Subscription"
          message={`Resume subscription "${sub.planName}"? Billing will restart on the next scheduled date.`}
          confirmLabel={isPending ? "Resuming…" : "Resume"}
          confirmClassName="bg-green-700 text-white hover:bg-green-800"
          onConfirm={() => {
            setDialog(null);
            startTransition(() => {
              callAction(`/api/owner/subscriptions/${sub.id}/resume`, "POST");
            });
          }}
          onCancel={() => setDialog(null)}
          loading={isPending}
        />
      )}
      {dialog?.type === "cancel" && (
        <CancelConfirmDialog
          planName={sub.planName}
          onConfirm={() => {
            setDialog(null);
            handleCancel();
          }}
          onCancel={() => setDialog(null)}
          loading={isPending}
        />
      )}
      {dialog?.type === "editDate" && (
        <EditNextDateDialog
          current={sub.nextBillingDate}
          onSave={handleSaveDate}
          onCancel={() => setDialog(null)}
          loading={isPending}
        />
      )}
      {dialog?.type === "editNote" && (
        <EditNoteDialog
          current={sub.internalNote}
          onSave={handleSaveNote}
          onCancel={() => setDialog(null)}
          loading={isPending}
        />
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium text-gray-900 text-sm">{sub.planName}</div>
            <div className="text-xs text-gray-500 mt-0.5">{sub.storeName}</div>
          </div>
          <Badge text={sub.status} className={statusClass} />
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-600">
          <div>
            <span className="text-gray-400">Interval: </span>
            {sub.interval}
          </div>
          <div>
            <span className="text-gray-400">Next Billing: </span>
            {fmtDate(sub.nextBillingDate)}
          </div>
          {sub.nextOrderAt && (
            <div>
              <span className="text-gray-400">Next Order: </span>
              {fmtDate(sub.nextOrderAt)}
            </div>
          )}
          {sub.pausedAt && (
            <div>
              <span className="text-gray-400">Paused: </span>
              {fmtDate(sub.pausedAt)}
            </div>
          )}
          {sub.cancelledAt && (
            <div>
              <span className="text-gray-400">Cancelled: </span>
              {fmtDate(sub.cancelledAt)}
            </div>
          )}
        </div>

        {sub.internalNote && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
            <span className="text-gray-400">Note: </span>
            {sub.internalNote}
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={handlePause}
            disabled={sub.status !== "ACTIVE" || isPending}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Pause
          </button>
          <button
            onClick={handleResume}
            disabled={sub.status !== "PAUSED" || isPending}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Resume
          </button>
          <button
            onClick={() => setDialog({ type: "cancel" })}
            disabled={sub.status === "CANCELLED" || isPending}
            className="px-2.5 py-1 text-xs border border-red-200 rounded hover:bg-red-50 text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={() => setDialog({ type: "editDate" })}
            disabled={sub.status === "CANCELLED" || isPending}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Edit Next Date
          </button>
          <button
            onClick={() => setDialog({ type: "editNote" })}
            disabled={sub.status === "CANCELLED" || isPending}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Edit Note
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Subscriptions Tab ────────────────────────────────────────────────────────

function SubscriptionsTab({ subscriptions }: { subscriptions: OwnerCustomerSubscriptionRow[] }) {
  if (subscriptions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
        <p className="text-sm text-gray-400">No subscriptions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {subscriptions.map((sub) => (
        <SubscriptionCard key={sub.id} sub={sub} />
      ))}
    </div>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({
  customerId,
  detail,
}: {
  customerId: string;
  detail: OwnerCustomerDetail;
}) {
  const [note, setNote] = useState(detail.internalNote ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSave() {
    setStatus("saving");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/owner/customers/${customerId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Failed to save note");
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 max-w-xl">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Internal Note
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={6}
          className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-y"
          placeholder="Add a private note about this customer…"
        />
      </div>
      {detail.noteUpdatedAt && (
        <p className="text-xs text-gray-400">
          Last updated: {new Date(detail.noteUpdatedAt).toLocaleString("en-NZ")}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save Note"}
        </button>
        {status === "saved" && (
          <span className="text-xs text-green-600 font-medium">Saved ✓</span>
        )}
        {status === "error" && (
          <span className="text-xs text-red-600">{errorMsg}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  customerId: string;
  detail: OwnerCustomerDetail;
  orders: { orders: OwnerCustomerOrderRow[]; total: number };
  subscriptions: OwnerCustomerSubscriptionRow[];
}

export default function CustomerDetailTabs({
  customerId,
  detail,
  orders,
  subscriptions,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div>
      {/* Tab Bar */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.key === "orders" && (
                <span className="ml-1.5 text-xs text-gray-400">({orders.total})</span>
              )}
              {tab.key === "subscriptions" && subscriptions.length > 0 && (
                <span className="ml-1.5 text-xs text-gray-400">({subscriptions.length})</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab detail={detail} />}
      {activeTab === "orders" && <OrdersTab orders={orders.orders} />}
      {activeTab === "subscriptions" && (
        <SubscriptionsTab subscriptions={subscriptions} />
      )}
      {activeTab === "notes" && (
        <NotesTab customerId={customerId} detail={detail} />
      )}
    </div>
  );
}
