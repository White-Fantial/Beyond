"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminDialog from "./AdminDialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TENANT_STATUS_OPTIONS = ["ACTIVE", "TRIAL", "SUSPENDED", "ARCHIVED"];

export default function CreateTenantDialog({ open, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    slug: "",
    legalName: "",
    displayName: "",
    timezone: "Asia/Seoul",
    currency: "KRW",
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
        const res = await fetch("/api/admin/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to create tenant.");
          return;
        }
        onClose();
        router.push(`/admin/tenants/${data.id}`);
        router.refresh();
      } catch {
        setError("A network error occurred. Please try again.");
      }
    });
  }

  return (
    <AdminDialog open={open} onClose={onClose} title="Create tenant">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Slug *" hint="Lowercase letters, numbers, and hyphens only (e.g. my-tenant)">
          <input name="slug" value={form.slug} onChange={handleChange} required
            className={inputCls} placeholder="my-tenant" />
        </Field>
        <Field label="Legal name *">
          <input name="legalName" value={form.legalName} onChange={handleChange} required className={inputCls} />
        </Field>
        <Field label="Display name *">
          <input name="displayName" value={form.displayName} onChange={handleChange} required className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Timezone *">
            <input name="timezone" value={form.timezone} onChange={handleChange} required className={inputCls} />
          </Field>
          <Field label="Currency *">
            <input name="currency" value={form.currency} onChange={handleChange} required maxLength={3} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Country code *">
            <input name="countryCode" value={form.countryCode} onChange={handleChange} required maxLength={2} className={inputCls} />
          </Field>
          <Field label="Status">
            <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
              {TENANT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60">
            {isPending ? "Creating..." : "Create tenant"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";
