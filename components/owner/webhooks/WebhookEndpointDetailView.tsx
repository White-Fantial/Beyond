"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WebhookEndpointDetail } from "@/types/owner-webhooks";
import WebhookDeliveryLog from "@/components/owner/webhooks/WebhookDeliveryLog";

interface Props {
  detail: WebhookEndpointDetail;
}

export default function WebhookEndpointDetailView({ detail }: Props) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setToggling(true);
    setError(null);
    try {
      await fetch(`/api/owner/webhooks/${detail.id}/toggle`, { method: "POST" });
      router.refresh();
    } catch {
      setError("Failed to toggle endpoint");
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this webhook endpoint? All delivery history will be removed.")) return;
    setDeleting(true);
    setError(null);
    try {
      await fetch(`/api/owner/webhooks/${detail.id}`, { method: "DELETE" });
      router.push("/owner/webhooks");
    } catch {
      setError("Failed to delete endpoint");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Endpoint URL</p>
            <p className="font-mono text-sm text-gray-900 break-all">{detail.url}</p>
          </div>
          <div>
            {detail.isActive ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Disabled</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Subscribed Events</p>
          <div className="flex flex-wrap gap-1">
            {detail.events.map((e) => (
              <span key={e} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                {e}
              </span>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {toggling ? "Updating…" : detail.isActive ? "Disable" : "Enable"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition"
          >
            {deleting ? "Deleting…" : "Delete Endpoint"}
          </button>
        </div>
      </div>
      <WebhookDeliveryLog deliveries={detail.recentDeliveries} />
    </div>
  );
}
