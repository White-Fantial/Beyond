"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ApplyForProviderInput,
  ProviderBusinessType,
} from "@/types/provider-onboarding";

const inputCls =
  "w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function ProviderApplyForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ApplyForProviderInput>({
    businessName: "",
    businessType: "INDIVIDUAL",
    taxId: "",
    portfolioUrl: "",
    introduction: "",
  });

  function update(field: keyof ApplyForProviderInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/provider/onboarding/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "신청에 실패했습니다.");
          return;
        }
        router.refresh();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          사업자명 / 활동명 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.businessName}
          onChange={(e) => update("businessName", e.target.value)}
          required
          className={inputCls}
          placeholder="예: 홍길동 요리연구소"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          사업자 유형
        </label>
        <select
          value={form.businessType}
          onChange={(e) =>
            update("businessType", e.target.value as ProviderBusinessType)
          }
          className={inputCls}
        >
          <option value="INDIVIDUAL">개인</option>
          <option value="COMPANY">법인</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          사업자등록번호 (선택)
        </label>
        <input
          type="text"
          value={form.taxId ?? ""}
          onChange={(e) => update("taxId", e.target.value)}
          className={inputCls}
          placeholder="예: 123-45-67890"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          포트폴리오 URL (선택)
        </label>
        <input
          type="url"
          value={form.portfolioUrl ?? ""}
          onChange={(e) => update("portfolioUrl", e.target.value)}
          className={inputCls}
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          자기소개 및 레시피 판매 계획
        </label>
        <textarea
          value={form.introduction ?? ""}
          onChange={(e) => update("introduction", e.target.value)}
          rows={4}
          className={inputCls}
          placeholder="어떤 레시피를 판매할 계획인지 간략히 소개해 주세요."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !form.businessName.trim()}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-60"
      >
        {isPending ? "제출 중..." : "신청하기"}
      </button>
    </form>
  );
}
