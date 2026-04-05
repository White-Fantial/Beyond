"use client";

import { useState } from "react";
import type { OwnerCatalogSettings } from "@/types/owner";

interface Props {
  storeId: string;
  initial: OwnerCatalogSettings;
}

const SOURCE_TYPE_OPTIONS = [
  { value: "LOCAL", label: "Local" },
  { value: "POS", label: "POS" },
  { value: "MERGED", label: "Merged" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "IMPORTED", label: "Imported" },
];

export default function CatalogSettingsForm({ storeId, initial }: Props) {
  const [form, setForm] = useState({
    sourceType: initial.sourceType,
    autoSync: initial.autoSync,
    syncIntervalMinutes: initial.syncIntervalMinutes,
    sourceConnectionId: initial.sourceConnectionId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === "number") {
      setForm((prev) => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/catalog-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: form.sourceType,
          autoSync: form.autoSync,
          syncIntervalMinutes: form.syncIntervalMinutes,
          sourceConnectionId: form.sourceConnectionId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      setMessage({ type: "success", text: "Catalog settings saved." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Source Type
          </label>
          <select
            name="sourceType"
            value={form.sourceType}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {SOURCE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Sync Interval (minutes)
          </label>
          <input
            type="number"
            name="syncIntervalMinutes"
            value={form.syncIntervalMinutes}
            onChange={handleChange}
            min={5}
            max={1440}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Source Connection ID
          </label>
          <input
            type="text"
            name="sourceConnectionId"
            value={form.sourceConnectionId}
            onChange={handleChange}
            placeholder="Leave blank to unset"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-3 pt-5">
          <input
            type="checkbox"
            id={`autoSync-${storeId}`}
            name="autoSync"
            checked={form.autoSync}
            onChange={handleChange}
            className="h-4 w-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
          />
          <label htmlFor={`autoSync-${storeId}`} className="text-sm text-gray-700">
            Auto Sync
          </label>
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
