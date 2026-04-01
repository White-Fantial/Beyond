"use client";

import { useState, useTransition } from "react";

interface Props {
  connectionId: string;
  currentStatus: string;
}

export default function ForceReconnectForm({ connectionId, currentStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<"REAUTH_REQUIRED" | "CONNECTING">(
    "REAUTH_REQUIRED"
  );
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<{ ok?: boolean; error?: string; newStatus?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAlreadyReauth = currentStatus === "REAUTH_REQUIRED";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/integrations/${connectionId}/force-reconnect`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetStatus, reason }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          setResult({ error: data.error ?? "요청 실패" });
        } else {
          setResult({ ok: true, newStatus: data.newStatus });
          setOpen(false);
          // Refresh page to reflect new status
          window.location.reload();
        }
      } catch {
        setResult({ error: "네트워크 오류가 발생했습니다." });
      }
    });
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center px-3 py-2 border border-orange-300 rounded text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors"
        >
          🔄 Force Reconnect
        </button>
      ) : (
        <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
          <h3 className="text-sm font-semibold text-orange-800 mb-3">Force Reconnect 요청</h3>
          {isAlreadyReauth && (
            <p className="text-xs text-orange-700 mb-3 bg-orange-100 rounded p-2">
              현재 이미 REAUTH_REQUIRED 상태입니다. 상태를 재확인하세요.
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">전환할 상태</label>
              <select
                value={targetStatus}
                onChange={(e) =>
                  setTargetStatus(e.target.value as "REAUTH_REQUIRED" | "CONNECTING")
                }
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-orange-400"
              >
                <option value="REAUTH_REQUIRED">REAUTH_REQUIRED (재인증 필요)</option>
                <option value="CONNECTING">CONNECTING (재연결 시도)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">사유 (운영 메모)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 고객 요청으로 재인증 강제 전환, 인증 오류 반복 발생 등"
                rows={2}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none"
              />
            </div>
            {result?.error && (
              <p className="text-xs text-red-600 bg-red-50 rounded p-2">{result.error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50"
              >
                {isPending ? "처리 중..." : "확인 및 실행"}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setResult(null); }}
                className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
