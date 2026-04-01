"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface RotateCredentialButtonProps {
  connectionId: string;
}

export default function RotateCredentialButton({ connectionId }: RotateCredentialButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function handleClick() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/integrations/${connectionId}/rotate-credential`,
          { method: "POST" }
        );
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "자격 증명 교체에 실패했습니다.");
          setConfirmed(false);
          return;
        }
        setSuccess(true);
        setConfirmed(false);
        router.refresh();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
        setConfirmed(false);
      }
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          confirmed
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-amber-600 text-white hover:bg-amber-700"
        }`}
      >
        {isPending
          ? "처리 중..."
          : confirmed
          ? "정말로 교체하시겠습니까? 다시 클릭하여 확인"
          : "자격 증명 교체 (Rotate Credential)"}
      </button>
      {confirmed && !isPending && (
        <button
          type="button"
          onClick={() => setConfirmed(false)}
          className="text-xs px-2 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          취소
        </button>
      )}
      {success && (
        <span className="text-xs text-green-600 font-medium">
          자격 증명이 교체되었습니다. 테넌트가 재인증해야 합니다.
        </span>
      )}
      {error && (
        <span className="text-xs text-red-600 font-medium">{error}</span>
      )}
    </div>
  );
}
