"use client";

import { useState } from "react";

interface DisconnectButtonProps {
  storeId: string;
  provider: string;
  connectionType: string;
  onDisconnected?: () => void;
}

export default function DisconnectButton({
  storeId,
  provider,
  connectionType,
  onDisconnected,
}: DisconnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDisconnect() {
    if (!window.confirm(`Are you sure you want to disconnect the ${provider} integration?`)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, provider, connectionType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Disconnection failed.");
        return;
      }
      onDisconnected?.();
      window.location.reload();
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleDisconnect}
        disabled={loading}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {loading ? "Disconnecting…" : "Disconnect"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
