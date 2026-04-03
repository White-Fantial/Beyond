"use client";

import { useState } from "react";
import type { AlertRule, AlertMetricType, CreateAlertRuleInput, UpdateAlertRuleInput } from "@/types/owner-notifications";

interface StoreOption {
  id: string;
  name: string;
}

interface Props {
  rule?: AlertRule;
  stores: StoreOption[];
  onSave: (data: CreateAlertRuleInput | UpdateAlertRuleInput) => Promise<void>;
  onCancel: () => void;
}

const METRIC_OPTIONS: { value: AlertMetricType; label: string; unit: string; hint: string }[] = [
  {
    value: "CANCELLATION_RATE",
    label: "Cancellation Rate",
    unit: "%",
    hint: "Alert when cancellation rate exceeds this percentage.",
  },
  {
    value: "REVENUE_DROP",
    label: "Revenue Drop",
    unit: "% (negative)",
    hint: "Alert when revenue drops by more than this percentage vs prior period. Enter a negative number (e.g. -30 for a 30% drop).",
  },
  {
    value: "SOLD_OUT_COUNT",
    label: "Sold-out Products",
    unit: "products",
    hint: "Alert when the number of sold-out products exceeds this count.",
  },
  {
    value: "ORDER_FAILURE_RATE",
    label: "Order Failure Rate",
    unit: "%",
    hint: "Alert when the POS forwarding failure rate exceeds this percentage.",
  },
  {
    value: "LOW_STOCK_ITEMS",
    label: "Low-stock Items",
    unit: "items",
    hint: "Alert when low-stock items exceed this count.",
  },
  {
    value: "POS_DISCONNECT",
    label: "POS Disconnect",
    unit: "connections",
    hint: "Alert when the number of disconnected POS connections exceeds this value (0 = alert on any).",
  },
  {
    value: "DELIVERY_DISCONNECT",
    label: "Delivery Disconnect",
    unit: "connections",
    hint: "Alert when delivery platform connections are disconnected.",
  },
];

const WINDOW_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 360, label: "6 hours" },
  { value: 1440, label: "24 hours" },
];

export default function AlertRuleForm({ rule, stores, onSave, onCancel }: Props) {
  const [metricType, setMetricType] = useState<AlertMetricType>(
    rule?.metricType ?? "CANCELLATION_RATE"
  );
  const [threshold, setThreshold] = useState(rule?.threshold?.toString() ?? "");
  const [windowMinutes, setWindowMinutes] = useState(rule?.windowMinutes ?? 60);
  const [storeId, setStoreId] = useState(rule?.storeId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMetric = METRIC_OPTIONS.find((m) => m.value === metricType);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(threshold);
    if (isNaN(parsed)) {
      setError("Threshold must be a number.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        storeId: storeId || undefined,
        metricType,
        threshold: parsed,
        windowMinutes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rule.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Metric type */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Metric</label>
        <select
          value={metricType}
          onChange={(e) => setMetricType(e.target.value as AlertMetricType)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          disabled={saving}
        >
          {METRIC_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {selectedMetric && (
          <p className="mt-1 text-xs text-gray-400">{selectedMetric.hint}</p>
        )}
      </div>

      {/* Threshold */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Threshold{selectedMetric ? ` (${selectedMetric.unit})` : ""}
        </label>
        <input
          type="number"
          step="any"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder="e.g. 20"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          required
          disabled={saving}
        />
      </div>

      {/* Window */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Evaluation Window</label>
        <select
          value={windowMinutes}
          onChange={(e) => setWindowMinutes(parseInt(e.target.value, 10))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          disabled={saving}
        >
          {WINDOW_OPTIONS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      {/* Store scope */}
      {stores.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Store <span className="text-gray-400 font-normal">(optional — leave blank for all stores)</span>
          </label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            disabled={saving}
          >
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-brand-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : rule ? "Save Changes" : "Create Rule"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
