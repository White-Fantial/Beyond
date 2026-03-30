"use client";

import { useState } from "react";

interface ConnectButtonProps {
  storeId: string;
  provider: string;
  connectionType: string;
  label: string;
}

export default function ConnectButton({
  storeId,
  provider,
  connectionType,
  label,
}: ConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, provider, connectionType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Connection failed.");
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "연결 중…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
