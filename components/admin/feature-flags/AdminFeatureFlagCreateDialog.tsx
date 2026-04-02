"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FlagType } from "@/types/feature-flags";
import { labelFlagType } from "@/lib/flags/labels";

const FLAG_TYPES: FlagType[] = ["BOOLEAN", "STRING", "INTEGER", "JSON", "VARIANT"];

export default function AdminFeatureFlagCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [flagType, setFlagType] = useState<FlagType>("BOOLEAN");
  const [defaultBoolValue, setDefaultBoolValue] = useState<boolean>(false);
  const [ownerNote, setOwnerNote] = useState("");
  const [isExperiment, setIsExperiment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        key: key.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        flagType,
        isExperiment,
        ownerNote: ownerNote.trim() || undefined,
      };
      if (flagType === "BOOLEAN") body.defaultBoolValue = defaultBoolValue;

      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error가 발생했습니다.");
        return;
      }
      const data = await res.json();
      setOpen(false);
      router.push(`/admin/feature-flags/${data.key}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
      >
        + New Flag
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Create New Feature Flag
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Key (stable identifier) *
                </label>
                <input
                  required
                  value={key}
                  onChange={(e) =>
                    setKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))
                  }
                  placeholder="e.g. catalog_sync_v2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                />
                <p className="text-xs text-gray-400 mt-0.5">
                  Use lowercase letters, numbers, and underscores only
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Catalog Sync V2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={flagType}
                  onChange={(e) => setFlagType(e.target.value as FlagType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {FLAG_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {labelFlagType(t)}
                    </option>
                  ))}
                </select>
              </div>

              {flagType === "BOOLEAN" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Default Value
                  </label>
                  <select
                    value={String(defaultBoolValue)}
                    onChange={(e) => setDefaultBoolValue(e.target.value === "true")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="false">false (기본 비Active)</option>
                    <option value="true">true (기본 Active)</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isExperiment"
                  checked={isExperiment}
                  onChange={(e) => setIsExperiment(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="isExperiment" className="text-xs text-gray-700">
                  Experiment Flag
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Owner Note (optional)
                </label>
                <input
                  value={ownerNote}
                  onChange={(e) => setOwnerNote(e.target.value)}
                  placeholder="Owner notes..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
