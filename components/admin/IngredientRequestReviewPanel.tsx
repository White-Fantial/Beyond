"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewIngredientRequestInput } from "@/types/marketplace";

interface IngredientRequestReviewPanelProps {
  requestId: string;
}

export default function IngredientRequestReviewPanel({
  requestId,
}: IngredientRequestReviewPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"APPROVED" | "REJECTED" | "DUPLICATE">(
    "REJECTED"
  );
  const [resolvedId, setResolvedId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: ReviewIngredientRequestInput = {
      status,
      reviewNotes: reviewNotes || undefined,
      ...(status === "APPROVED" || status === "DUPLICATE"
        ? { resolvedIngredientId: resolvedId || undefined }
        : {}),
    };

    try {
      const res = await fetch(
        `/api/admin/ingredient-requests/${requestId}/review`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "검토 저장에 실패했습니다.");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        검토
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2 w-72"
    >
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          결정 *
        </label>
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as typeof status)
          }
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
        >
          <option value="APPROVED">승인 (플랫폼 재료 등록)</option>
          <option value="DUPLICATE">중복 (기존 재료 연결)</option>
          <option value="REJECTED">반려</option>
        </select>
      </div>

      {(status === "APPROVED" || status === "DUPLICATE") && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            플랫폼 재료 ID *
          </label>
          <input
            type="text"
            value={resolvedId}
            onChange={(e) => setResolvedId(e.target.value)}
            placeholder="Ingredient UUID (scope=PLATFORM)"
            required
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono"
          />
          <p className="text-xs text-gray-400 mt-0.5">
            승인 전에 /admin/platform-ingredients에서 먼저 재료를 생성하세요.
          </p>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          검토 메모
        </label>
        <textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          rows={2}
          placeholder="검토 의견 (선택)"
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "확인"}
        </button>
      </div>
    </form>
  );
}
