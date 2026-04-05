"use client";

import { useState } from "react";
import type { OwnerOperationSettings } from "@/types/owner";

interface Props {
  storeId: string;
  initial: OwnerOperationSettings;
}

export default function OperationsSettingsForm({ storeId, initial }: Props) {
  const [form, setForm] = useState({
    storeOpen: initial.storeOpen,
    holidayMode: initial.holidayMode,
    autoAcceptOrders: initial.autoAcceptOrders,
    autoPrintPos: initial.autoPrintPos,
    subscriptionEnabled: initial.subscriptionEnabled,
    onlineOrderEnabled: initial.onlineOrderEnabled,
    pickupIntervalMinutes: initial.pickupIntervalMinutes,
    minPrepTimeMinutes: initial.minPrepTimeMinutes,
    maxOrdersPerSlot: initial.maxOrdersPerSlot,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleToggle(name: string) {
    setForm((prev) => ({ ...prev, [name]: !prev[name as keyof typeof prev] }));
  }

  function handleNumber(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: parseInt(e.target.value, 10) || 0 }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/operations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      setMessage({ type: "success", text: "Operations settings saved." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Status Toggles
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(
            [
              { name: "storeOpen", label: "Store Open" },
              { name: "holidayMode", label: "Holiday Mode" },
              { name: "autoAcceptOrders", label: "Auto Accept Orders" },
              { name: "autoPrintPos", label: "Auto Print POS" },
              { name: "subscriptionEnabled", label: "Subscription Enabled" },
              { name: "onlineOrderEnabled", label: "Online Order Enabled" },
            ] as const
          ).map(({ name, label }) => (
            <button
              key={name}
              type="button"
              onClick={() => handleToggle(name)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                form[name]
                  ? "border-green-300 bg-green-50 text-green-800"
                  : "border-gray-200 bg-gray-50 text-gray-600"
              }`}
            >
              <span>{label}</span>
              <span
                className={`ml-2 h-4 w-4 rounded-full flex-shrink-0 ${
                  form[name] ? "bg-green-500" : "bg-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Timing &amp; Limits
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberField
            label="Pickup Interval (min)"
            name="pickupIntervalMinutes"
            value={form.pickupIntervalMinutes}
            onChange={handleNumber}
            min={5}
            max={120}
          />
          <NumberField
            label="Min Prep Time (min)"
            name="minPrepTimeMinutes"
            value={form.minPrepTimeMinutes}
            onChange={handleNumber}
            min={0}
            max={240}
          />
          <NumberField
            label="Max Orders / Slot"
            name="maxOrdersPerSlot"
            value={form.maxOrdersPerSlot}
            onChange={handleNumber}
            min={1}
            max={500}
          />
        </div>
      </div>
      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function NumberField({
  label,
  name,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}
