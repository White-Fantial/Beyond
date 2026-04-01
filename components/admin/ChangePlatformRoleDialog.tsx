"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminDialog from "./AdminDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentRole: string;
}

const PLATFORM_ROLE_OPTIONS = [
  { value: "USER", label: "USER" },
  { value: "PLATFORM_SUPPORT", label: "PLATFORM_SUPPORT" },
  { value: "PLATFORM_ADMIN", label: "PLATFORM_ADMIN" },
];
const inputCls = "w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function ChangePlatformRoleDialog({ open, onClose, userId, currentRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [platformRole, setPlatformRole] = useState(currentRole);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (platformRole === currentRole) {
      onClose();
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/platform-role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platformRole }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to change role.");
          return;
        }
        onClose();
        router.refresh();
      } catch {
        setError("A network error occurred. Please try again.");
      }
    });
  }

  return (
    <AdminDialog open={open} onClose={onClose} title="Change platform role">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Changes the user&apos;s platform-wide role. This is separate from tenant and store membership roles.
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Platform role</label>
          <select value={platformRole} onChange={(e) => setPlatformRole(e.target.value)} className={inputCls}>
            {PLATFORM_ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={isPending || platformRole === currentRole}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60">
            {isPending ? "Saving..." : "Change role"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}
