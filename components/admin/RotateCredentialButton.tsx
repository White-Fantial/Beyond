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
          setError(data.error ?? "Failed to rotate credential.");
          setConfirmed(false);
          return;
        }
        setSuccess(true);
        setConfirmed(false);
        router.refresh();
      } catch {
        setError("A network error occurred. Please try again.");
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
          ? "Processing..."
          : confirmed
          ? "Rotate credential? Click again to confirm."
          : "Rotate credential"}
      </button>
      {confirmed && !isPending && (
        <button
          type="button"
          onClick={() => setConfirmed(false)}
          className="text-xs px-2 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      )}
      {success && (
        <span className="text-xs text-green-600 font-medium">
          Credential rotated. Tenant must re-authenticate.
        </span>
      )}
      {error && (
        <span className="text-xs text-red-600 font-medium">{error}</span>
      )}
    </div>
  );
}
