"use client";

import { useState, useTransition } from "react";
import type { StoreRoleKey } from "@/types/backoffice";

const ROLES: StoreRoleKey[] = ["STAFF", "SUPERVISOR", "MANAGER", "ADMIN"];

interface Props {
  storeId: string;
  storeMembershipId: string;
  currentRole: StoreRoleKey;
  onUpdated?: (role: StoreRoleKey) => void;
}

export default function StaffRoleSelect({ storeId, storeMembershipId, currentRole, onUpdated }: Props) {
  const [role, setRole] = useState(currentRole);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as StoreRoleKey;
    setRole(newRole);
    startTransition(async () => {
      await fetch(`/api/backoffice/${storeId}/staff/${storeMembershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      onUpdated?.(newRole);
    });
  }

  return (
    <select
      value={role}
      onChange={handleChange}
      disabled={isPending}
      className="text-sm border border-gray-200 rounded px-2 py-1 disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
      ))}
    </select>
  );
}
