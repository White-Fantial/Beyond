"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const CONNECTION_STATUS_OPTIONS = [
  { value: "CONNECTED", label: "CONNECTED — 활성 연결" },
  { value: "DISCONNECTED", label: "DISCONNECTED — 연결 해제" },
  { value: "REAUTH_REQUIRED", label: "REAUTH_REQUIRED — 재인증 필요" },
  { value: "ERROR", label: "ERROR — 오류 상태" },
  { value: "NOT_CONNECTED", label: "NOT_CONNECTED — 미연결" },
];

interface ConnectionStatusChangeFormProps {
  connectionId: string;
  currentStatus: string;
}

export default function ConnectionStatusChangeForm({
  connectionId,
  currentStatus,
}: ConnectionStatusChangeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isDirty = selected !== currentStatus;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) return;
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/integrations/${connectionId}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: selected }),
          }
        );
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "상태 변경에 실패했습니다.");
          return;
        }
        setSuccess(true);
        router.refresh();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <select
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          setSuccess(false);
          setError(null);
        }}
        disabled={isPending}
        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
      >
        {CONNECTION_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!isDirty || isPending}
        className="text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
      {success && (
        <span className="text-xs text-green-600 font-medium">저장되었습니다.</span>
      )}
      {error && (
        <span className="text-xs text-red-600 font-medium">{error}</span>
      )}
    </form>
  );
}
