"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminDialog from "./AdminDialog";

interface InitialData {
  legalName: string;
  displayName: string;
  timezone: string;
  currency: string;
  countryCode: string;
  status: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  initialData: InitialData;
}

const TENANT_STATUS_OPTIONS = ["ACTIVE", "TRIAL", "SUSPENDED", "ARCHIVED"];
const inputCls = "w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function EditTenantDialog({ open, onClose, tenantId, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<InitialData>(initialData);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/tenants/${tenantId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "수정에 실패했습니다.");
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
    <AdminDialog open={open} onClose={onClose} title="테넌트 편집">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">법인명 *</label>
          <input name="legalName" value={form.legalName} onChange={handleChange} required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">표시명 *</label>
          <input name="displayName" value={form.displayName} onChange={handleChange} required className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">시간대</label>
            <input name="timezone" value={form.timezone} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">통화</label>
            <input name="currency" value={form.currency} onChange={handleChange} maxLength={3} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">국가 코드</label>
            <input name="countryCode" value={form.countryCode} onChange={handleChange} maxLength={2} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">상태</label>
            <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
              {TENANT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
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
