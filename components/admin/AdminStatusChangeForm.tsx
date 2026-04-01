"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface StatusOption {
  value: string;
  label: string;
}

interface AdminStatusChangeFormProps {
  entityType: "tenants" | "users" | "stores";
  entityId: string;
  currentStatus: string;
  options: StatusOption[];
}

export default function AdminStatusChangeForm({
  entityType,
  entityId,
  currentStatus,
  options,
}: AdminStatusChangeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isDirty = selected !== currentStatus;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) return;
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/${entityType}/${entityId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: selected }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to update status.");
          return;
        }
        setSuccess(true);
        router.refresh();
      } catch {
        setError("A network error occurred. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <select
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          setSuccess(false);
          setError(null);
        }}
        disabled={isPending}
        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!isDirty || isPending}
        className="text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
      {success && (
        <span className="text-xs text-green-600 font-medium">Changes saved.</span>
      )}
      {error && (
        <span className="text-xs text-red-600 font-medium">{error}</span>
      )}
    </form>
  );
}
