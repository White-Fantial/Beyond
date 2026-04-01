"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

interface Props {
  connectionId: string;
  canRefreshCredentials: boolean;
}

export default function TriggerRefreshCheckButton({
  connectionId,
  canRefreshCredentials,
}: Props) {
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<{ jobRunId?: string; message?: string; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canRefreshCredentials) return null;

  function handleTrigger() {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/integrations/${connectionId}/trigger-refresh-check`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "Admin manual refresh check" }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          setResult({ error: data.error ?? "갱신 요청 실패" });
        } else {
          setResult(data);
        }
        setConfirm(false);
      } catch {
        setResult({ error: "네트워크 오류가 발생했습니다." });
        setConfirm(false);
      }
    });
  }

  return (
    <div>
      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="inline-flex items-center px-3 py-2 border border-teal-300 rounded text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
        >
          🔑 토큰 갱신 확인
        </button>
      ) : (
        <div className="border border-teal-200 rounded-lg p-4 bg-teal-50">
          <p className="text-sm font-semibold text-teal-800 mb-1">토큰 갱신 확인 실행</p>
          <p className="text-xs text-teal-700 mb-3">
            만료 예정이거나 만료된 자격 증명의 갱신을 시도합니다. 기존 refresh 로직과 동일한 안전 장치가 적용됩니다.
            계속하시겠습니까?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleTrigger}
              disabled={isPending}
              className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 disabled:opacity-50"
            >
              {isPending ? "요청 중..." : "실행"}
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      )}
      {result && (
        <div
          className={`mt-2 rounded p-3 text-xs ${
            result.error
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-green-50 border border-green-200 text-green-700"
          }`}
        >
          {result.error ? (
            <p>{result.error}</p>
          ) : (
            <>
              <p className="font-semibold mb-1">✓ 토큰 갱신 확인 작업 대기열 추가</p>
              <p>{result.message}</p>
              {result.jobRunId && (
                <Link
                  href={`/admin/jobs/${result.jobRunId}`}
                  className="mt-1 block underline font-medium"
                >
                  작업 상세 보기 →
                </Link>
              )}
            </>
          )}
          <button
            onClick={() => setResult(null)}
            className="mt-2 text-xs underline opacity-70 hover:opacity-100"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
