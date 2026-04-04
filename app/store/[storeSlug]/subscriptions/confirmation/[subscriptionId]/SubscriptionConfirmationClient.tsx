"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { GuestSubscriptionStatus } from "@/types/storefront";

const STATUS_CONFIG: Record<string, { icon: string; label: string; description: string; color: string }> = {
  ACTIVE: {
    icon: "✅",
    label: "Active",
    description: "Your subscription is active and will renew automatically.",
    color: "text-green-600",
  },
  PAUSED: {
    icon: "⏸️",
    label: "Paused",
    description: "Your subscription is currently paused.",
    color: "text-yellow-600",
  },
  CANCELLED: {
    icon: "❌",
    label: "Cancelled",
    description: "Your subscription has been cancelled.",
    color: "text-red-600",
  },
};

const TERMINAL_STATUSES = ["CANCELLED"];

interface Props {
  storeSlug: string;
  subscriptionId: string;
}

export default function SubscriptionConfirmationClient({ storeSlug, subscriptionId }: Props) {
  const [status, setStatus] = useState<GuestSubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/store/${storeSlug}/subscriptions/${subscriptionId}`);
        if (!res.ok) {
          if (!cancelled) setError("Could not load subscription status.");
          return;
        }
        const data = (await res.json()) as GuestSubscriptionStatus;
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setError("Network error. Please refresh the page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStatus();

    return () => { cancelled = true; };
  }, [storeSlug, subscriptionId]);

  useEffect(() => {
    if (!status || TERMINAL_STATUSES.includes(status.status)) return;

    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/store/${storeSlug}/subscriptions/${subscriptionId}`);
        if (!res.ok) return;
        const data = (await res.json()) as GuestSubscriptionStatus;
        setStatus(data);
      } catch {
        // swallow
      }
    }, 5_000);

    return () => clearTimeout(id);
  }, [storeSlug, subscriptionId, status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-spin">🔄</div>
          <p className="text-sm text-gray-500">Loading subscription…</p>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
          <h1 className="text-lg font-bold text-gray-900 text-center">Subscription Status</h1>
        </header>
        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm text-gray-500 mb-4">{error ?? "Subscription not found."}</p>
          <Link
            href={`/store/${storeSlug}/subscriptions`}
            className="inline-block px-6 py-3 bg-brand-600 text-white rounded-full font-semibold hover:bg-brand-700 transition-colors"
          >
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[status.status] ?? {
    icon: "🔄",
    label: status.status,
    description: "Processing your subscription.",
    color: "text-gray-600",
  };

  const isTerminal = TERMINAL_STATUSES.includes(status.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <h1 className="text-lg font-bold text-gray-900 text-center">Subscription Status</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
          <div className="text-6xl mb-3">{config.icon}</div>
          <h2 className={`text-xl font-bold mb-2 ${config.color}`}>{config.label}</h2>
          <p className="text-sm text-gray-500">{config.description}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Reference</span>
            <span className="font-mono text-xs font-bold text-gray-900">
              {status.subscriptionId.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Start Date</span>
            <span className="font-medium text-gray-900">
              {new Date(status.startDate).toLocaleDateString("en-NZ")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Next Billing</span>
            <span className="font-medium text-gray-900">
              {new Date(status.nextBillingDate).toLocaleDateString("en-NZ")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Last Updated</span>
            <span className="text-xs text-gray-400">
              {new Date(status.updatedAt).toLocaleString("en-NZ")}
            </span>
          </div>
        </div>

        {!isTerminal && (
          <p className="text-center text-xs text-gray-400">
            🔄 Status updates automatically every 5 seconds
          </p>
        )}

        <div className="space-y-2">
          <Link
            href={`/store/${storeSlug}/subscriptions`}
            className="block w-full py-3 bg-brand-600 hover:bg-brand-700 text-white text-center font-semibold rounded-full transition-colors"
          >
            View All Plans
          </Link>
          <Link
            href={`/store/${storeSlug}`}
            className="block w-full py-2 text-sm text-center text-gray-500 hover:text-gray-700"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
