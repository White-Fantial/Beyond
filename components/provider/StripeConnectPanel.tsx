"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  accountId: string | null;
  onboarded: boolean;
  payoutsEnabled: boolean;
}

export default function StripeConnectPanel({ accountId, onboarded, payoutsEnabled }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/provider/onboarding/stripe/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Stripe 연결에 실패했습니다.");
          return;
        }
        window.location.href = data.data.url;
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  }

  async function handleRefresh() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/provider/onboarding/stripe/refresh");
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "상태 새로고침에 실패했습니다.");
          return;
        }
        router.refresh();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  }

  if (payoutsEnabled) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
          <span>✅</span>
          <span>Stripe 계좌 연결 완료 — 수익금 정산이 가능합니다.</span>
        </div>
        {accountId && (
          <p className="text-xs text-green-600">계좌 ID: {accountId}</p>
        )}
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="text-xs text-green-700 underline hover:no-underline disabled:opacity-60"
        >
          상태 새로고침
        </button>
      </div>
    );
  }

  if (onboarded && !payoutsEnabled) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
        <p className="text-sm text-yellow-800 font-medium">
          ⏳ Stripe 계좌 심사 중
        </p>
        <p className="text-xs text-yellow-700">
          계좌 정보가 제출되었습니다. Stripe 심사가 완료되면 출금이 가능합니다.
        </p>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="text-xs text-yellow-700 underline hover:no-underline disabled:opacity-60"
        >
          {isPending ? "확인 중..." : "상태 새로고침"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
      <p className="text-sm text-orange-800 font-medium">
        💳 수익금 정산을 위해 Stripe 계좌를 연결해주세요
      </p>
      <p className="text-xs text-orange-700">
        레시피 판매 수익금은 Stripe Connect를 통해 정산됩니다. 계좌 연결 시
        Stripe의 신원 확인 절차가 진행됩니다.
      </p>
      <button
        onClick={handleConnect}
        disabled={isPending}
        className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60"
      >
        {isPending ? "연결 중..." : "Stripe 계좌 연결"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
