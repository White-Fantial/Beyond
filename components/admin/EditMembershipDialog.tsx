"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminDialog from "./AdminDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  membershipId: string;
  currentRole: string;
  currentStatus: string;
}

const MEMBERSHIP_ROLE_OPTIONS = ["OWNER", "ADMIN", "MANAGER", "STAFF", "ANALYST"];
const MEMBERSHIP_STATUS_OPTIONS = ["ACTIVE", "INVITED", "SUSPENDED", "REMOVED"];
const inputCls = "w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function EditMembershipDialog({ open, onClose, membershipId, currentRole, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState(currentRole);
  const [status, setStatus] = useState(currentStatus);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/memberships/${membershipId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, status }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "멤버십 수정에 실패했습니다.");
          return;
        }
        onClose();
        router.refresh();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  }

  return (
    <AdminDialog open={open} onClose={onClose} title="테넌트 멤버십 편집">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">멤버십 역할</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
              {MEMBERSHIP_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">상태</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              {MEMBERSHIP_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-60">
            취소
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60">
            {isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}
