"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReviewProviderApplicationInput } from "@/types/provider-onboarding";

interface Props {
  applicationId: string;
}

export default function ProviderApplicationReviewPanel({ applicationId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [expanded, setExpanded] = useState(false);

  async function handleReview(status: "APPROVED" | "REJECTED") {
    setError(null);
    const body: ReviewProviderApplicationInput = { status, adminNotes: adminNotes || undefined };
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/provider-applications/${applicationId}/review`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "처리에 실패했습니다.");
          return;
        }
        router.refresh();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs text-blue-600 hover:underline font-medium"
      >
        검토하기
      </button>
    );
  }

  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <textarea
        value={adminNotes}
        onChange={(e) => setAdminNotes(e.target.value)}
        rows={2}
        placeholder="관리자 메모 (선택사항)"
        className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => handleReview("APPROVED")}
          disabled={isPending}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded disabled:opacity-60"
        >
          {isPending ? "처리 중..." : "승인"}
        </button>
        <button
          onClick={() => handleReview("REJECTED")}
          disabled={isPending}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded disabled:opacity-60"
        >
          {isPending ? "처리 중..." : "반려"}
        </button>
        <button
          onClick={() => setExpanded(false)}
          className="px-3 py-1.5 text-gray-600 text-xs font-medium rounded hover:bg-gray-100"
        >
          취소
        </button>
      </div>
    </div>
  );
}
