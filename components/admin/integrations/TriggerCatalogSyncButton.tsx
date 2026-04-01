"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

interface Props {
  connectionId: string;
  supportsCatalogSync: boolean;
}

export default function TriggerCatalogSyncButton({
  connectionId,
  supportsCatalogSync,
}: Props) {
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<{ jobRunId?: string; message?: string; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!supportsCatalogSync) return null;

  function handleTrigger() {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/integrations/${connectionId}/trigger-sync`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "Admin manual catalog sync" }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          setResult({ error: data.error ?? "동기화 요청 실패" });
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
          className="inline-flex items-center px-3 py-2 border border-indigo-300 rounded text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
        >
          📦 카탈로그 동기화
        </button>
      ) : (
        <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
          <p className="text-sm font-semibold text-indigo-800 mb-1">카탈로그 동기화 실행</p>
          <p className="text-xs text-indigo-700 mb-3">
            이 연결의 전체 카탈로그를 즉시 동기화합니다. 기존 카탈로그는 업데이트되며 새 항목이 추가됩니다.
            계속하시겠습니까?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleTrigger}
              disabled={isPending}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
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
              <p className="font-semibold mb-1">✓ 동기화 작업 대기열 추가</p>
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
