"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminDialog from "./AdminDialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PLATFORM_ROLE_OPTIONS = ["USER", "PLATFORM_ADMIN", "PLATFORM_SUPPORT"];
const USER_STATUS_OPTIONS = ["ACTIVE", "INVITED", "SUSPENDED", "ARCHIVED"];
const inputCls = "w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function CreateUserDialog({ open, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    platformRole: "USER",
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
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to create user.");
          return;
        }
        onClose();
        router.push(`/admin/users/${data.id}`);
        router.refresh();
      } catch {
        setError("A network error occurred. Please try again.");
      }
    });
  }

  return (
    <AdminDialog open={open} onClose={onClose} title="Create user">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
          <input name="name" value={form.name} onChange={handleChange} required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Password * (min 8 characters)</label>
          <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={8} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Platform role</label>
            <select name="platformRole" value={form.platformRole} onChange={handleChange} className={inputCls}>
              {PLATFORM_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
              {USER_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
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
            {isPending ? "Creating..." : "Create user"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}
