"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminDialog from "./AdminDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId?: string;
}

const STORE_STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "ARCHIVED"];
const inputCls = "w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function CreateStoreDialog({ open, onClose, tenantId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    tenantId: tenantId ?? "",
    code: "",
    name: "",
    displayName: "",
    timezone: "Asia/Seoul",
    currency: "USD",
    countryCode: "KR",
    status: "ACTIVE",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to create store.");
          return;
        }
        onClose();
        router.push(`/admin/stores/${data.id}`);
        router.refresh();
      } catch {
        setError("A network error occurred. Please try again.");
      }
    });
  }

  return (
    <AdminDialog open={open} onClose={onClose} title="Create store">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!tenantId && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tenant ID *</label>
            <input name="tenantId" value={form.tenantId} onChange={handleChange} required className={inputCls} placeholder="Tenant UUID" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Code *</label>
            <input name="code" value={form.code} onChange={handleChange} required className={inputCls} placeholder="store-001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
              {STORE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Store name *</label>
          <input name="name" value={form.name} onChange={handleChange} required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Display name *</label>
          <input name="displayName" value={form.displayName} onChange={handleChange} required className={inputCls} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
            <input name="timezone" value={form.timezone} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
            <input name="currency" value={form.currency} onChange={handleChange} maxLength={3} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Country code</label>
            <input name="countryCode" value={form.countryCode} onChange={handleChange} maxLength={2} className={inputCls} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60">
            {isPending ? "Creating..." : "Create store"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}
