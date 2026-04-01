"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BillingRecordType } from "@/types/admin-billing";

interface Props {
  tenantId: string;
  subscriptionId?: string;
  onSuccess?: () => void;
}

export default function AdminBillingNoteForm({ tenantId, subscriptionId, onSuccess }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [recordType, setRecordType] = useState<BillingRecordType>("NOTE");
  const [summary, setSummary] = useState("");
  const [amountMinor, setAmountMinor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) {
      setError("내용을 입력해주세요.");
      return;
    }
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {
          recordType,
          summary: summary.trim(),
          status: "OPEN",
        };
        if (subscriptionId) payload.tenantSubscriptionId = subscriptionId;
        if (amountMinor && (recordType === "ADJUSTMENT" || recordType === "CREDIT")) {
          payload.amountMinor = Number(amountMinor);
          payload.currencyCode = "NZD";
        }

        const res = await fetch(`/api/admin/billing/tenants/${tenantId}/billing-record`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "저장에 실패했습니다.");
          return;
        }
        setSummary("");
        setAmountMinor("");
        setSuccess(true);
        router.refresh();
        onSuccess?.();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">유형</label>
          <select
            value={recordType}
            onChange={(e) => setRecordType(e.target.value as BillingRecordType)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="NOTE">메모</option>
            <option value="ADJUSTMENT">조정</option>
            <option value="CREDIT">크레딧</option>
          </select>
        </div>

        {(recordType === "ADJUSTMENT" || recordType === "CREDIT") && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">금액 (센트)</label>
            <input
              type="number"
              min={0}
              value={amountMinor}
              onChange={(e) => setAmountMinor(e.target.value)}
              placeholder="예: 4900 = $49.00"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">내용 *</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          placeholder="메모 또는 조정 내용..."
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-3 py-2">
          기록이 추가되었습니다.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "기록 추가"}
        </button>
      </div>
    </form>
  );
}
