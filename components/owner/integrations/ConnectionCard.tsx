"use client";

import { useState } from "react";
import ConnectionStatusBadge from "./ConnectionStatusBadge";
import type { OwnerTenantConnectionCard } from "@/services/owner/owner-integrations.service";

interface Props {
  card: OwnerTenantConnectionCard;
  onDisconnected?: () => void;
  onSynced?: () => void;
}

const PROVIDER_ICONS: Record<string, string> = {
  LOYVERSE: "🔶",
  LIGHTSPEED: "⚡",
  UBER_EATS: "🟢",
  DOORDASH: "🔴",
  STRIPE: "💳",
};

const TYPE_LABELS: Record<string, string> = {
  POS: "POS",
  DELIVERY: "Delivery",
  PAYMENT: "Payment",
};

export default function ConnectionCard({ card, onDisconnected, onSynced }: Props) {
  const [actionState, setActionState] = useState<"idle" | "syncing" | "disconnecting">("idle");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isConnected = card.status === "CONNECTED";
  const canSync = isConnected && card.connectionId;
  const canDisconnect =
    card.connectionId &&
    card.status !== "NOT_CONNECTED" &&
    card.status !== "DISCONNECTED";

  async function handleSync() {
    if (!card.connectionId) return;
    setActionState("syncing");
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/integrations/${card.connectionId}/sync`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Sync failed");
      }
      setMessage({ type: "success", text: "Catalog sync requested." });
      onSynced?.();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Sync failed" });
    } finally {
      setActionState("idle");
    }
  }

  async function handleDisconnect() {
    if (!card.connectionId) return;
    if (!confirm(`Disconnect ${card.label} from ${card.storeName ?? "this store"}?`)) return;
    setActionState("disconnecting");
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/integrations/${card.connectionId}/disconnect`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Disconnect failed");
      }
      setMessage({ type: "success", text: "Disconnected." });
      onDisconnected?.();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Disconnect failed" });
    } finally {
      setActionState("idle");
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0" aria-hidden="true">
            {PROVIDER_ICONS[card.provider] ?? "🔌"}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{card.label}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {TYPE_LABELS[card.connectionType] ?? card.connectionType}
              </span>
              {card.storeName && (
                <span className="text-xs text-gray-500">{card.storeName}</span>
              )}
            </div>
            {card.externalStoreName && (
              <p className="text-xs text-gray-500 mt-0.5">{card.externalStoreName}</p>
            )}
            {card.lastSyncAt && (
              <p className="text-xs text-gray-400 mt-0.5">
                Last sync: {new Date(card.lastSyncAt).toLocaleString()}
              </p>
            )}
            {card.lastErrorMessage && card.status === "ERROR" && (
              <p className="text-xs text-red-500 mt-0.5">{card.lastErrorMessage}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ConnectionStatusBadge status={card.status} />
        </div>
      </div>

      {message && (
        <p
          className={`mt-2 text-xs ${message.type === "success" ? "text-green-700" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}

      {(canSync || canDisconnect) && (
        <div className="mt-3 flex items-center gap-2">
          {canSync && (
            <button
              onClick={handleSync}
              disabled={actionState !== "idle"}
              className="text-xs px-2.5 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {actionState === "syncing" ? "Syncing…" : "Sync Now"}
            </button>
          )}
          {canDisconnect && (
            <button
              onClick={handleDisconnect}
              disabled={actionState !== "idle"}
              className="text-xs px-2.5 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {actionState === "disconnecting" ? "Disconnecting…" : "Disconnect"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
