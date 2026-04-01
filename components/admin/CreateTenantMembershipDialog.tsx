"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminDialog from "./AdminDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId?: string;
  userId?: string;
}

const MEMBERSHIP_ROLE_OPTIONS = ["OWNER", "ADMIN", "MANAGER", "STAFF", "ANALYST"];
const MEMBERSHIP_STATUS_OPTIONS = ["ACTIVE", "INVITED", "SUSPENDED", "REMOVED"];
const inputCls = "w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function CreateTenantMembershipDialog({ open, onClose, tenantId, userId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    tenantId: tenantId ?? "",
    userId: userId ?? "",
    role: "STAFF",
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
        const res = await fetch("/api/admin/memberships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "멤버십 생성에 실패했습니다.");
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
    <AdminDialog open={open} onClose={onClose} title="테넌트 멤버십 추가">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!tenantId && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">테넌트 ID *</label>
            <input name="tenantId" value={form.tenantId} onChange={handleChange} required className={inputCls} placeholder="테넌트 UUID" />
          </div>
        )}
        {!userId && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">사용자 ID *</label>
            <input name="userId" value={form.userId} onChange={handleChange} required className={inputCls} placeholder="사용자 UUID" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">멤버십 역할 *</label>
            <select name="role" value={form.role} onChange={handleChange} className={inputCls}>
              {MEMBERSHIP_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">상태</label>
            <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
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
            {isPending ? "추가 중..." : "멤버십 추가"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}
