"use client";

import { useState, useTransition } from "react";

interface Props {
  connectionId: string;
}

interface ValidationResult {
  success?: boolean;
  message?: string;
  connectionStatus?: string;
  error?: string;
}

export default function ValidateConnectionButton({ connectionId }: Props) {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleValidate() {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/integrations/${connectionId}/validate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "Admin manual validation" }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          setResult({ error: data.error ?? "Validation failed" });
        } else {
          setResult(data);
        }
      } catch {
        setResult({ error: "A network error occurred." });
      }
    });
  }

  return (
    <div>
      <button
        onClick={handleValidate}
        disabled={isPending}
        className="inline-flex items-center px-3 py-2 border border-blue-300 rounded text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50"
      >
        {isPending ? "Validating..." : "🔍 Validate Connection"}
      </button>
      {result && (
        <div
          className={`mt-2 rounded p-3 text-xs ${
            result.error || result.success === false
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-green-50 border border-green-200 text-green-700"
          }`}
        >
          {result.error ? (
            <p>{result.error}</p>
          ) : (
            <>
              <p className="font-semibold mb-1">
                {result.success ? "✓ Validation successful" : "✗ Validation failed"}
              </p>
              <p>{result.message}</p>
              {result.connectionStatus && (
                <p className="mt-1 text-gray-500">
                  Current status: <span className="font-mono">{result.connectionStatus}</span>
                </p>
              )}
              {!result.success && (
                <p className="mt-2 text-xs text-gray-600">
                  Recommended action:{" "}
                  {result.connectionStatus === "REAUTH_REQUIRED"
                    ? "Run Force Reconnect or ask the store owner to re-authenticate."
                    : "Check the connection status and credentials."}
                </p>
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
