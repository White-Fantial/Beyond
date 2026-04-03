"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CustomerAddress } from "@/types/customer";

interface Props {
  address: CustomerAddress;
  onDeleted: () => void;
  onEdit: (address: CustomerAddress) => void;
}

export function AddressCard({ address, onDeleted, onEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSetDefault() {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/customer/addresses/${address.id}/set-default`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to set default.");
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this address?")) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/customer/addresses/${address.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to delete address.");
        return;
      }
      onDeleted();
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{address.label}</span>
            {address.isDefault && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                Default
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{address.line1}</p>
          {address.line2 && <p className="text-sm text-gray-600">{address.line2}</p>}
          <p className="text-sm text-gray-600">
            {address.city}
            {address.region ? `, ${address.region}` : ""}
            {address.postalCode ? ` ${address.postalCode}` : ""}
          </p>
          <p className="text-sm text-gray-500">{address.country}</p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        {!address.isDefault && (
          <button
            onClick={handleSetDefault}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 transition"
          >
            Set as Default
          </button>
        )}
        <button
          onClick={() => onEdit(address)}
          disabled={isPending}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
