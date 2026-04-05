"use client";

import { useState } from "react";
import type { PushPreferences } from "@/types/customer-referrals";

interface Props {
  initialPrefs: PushPreferences;
}

const CATEGORIES: Array<{ key: keyof PushPreferences; label: string; description: string }> = [
  { key: "orders", label: "Orders", description: "Order status updates and pickup reminders" },
  { key: "promotions", label: "Promotions", description: "Special offers, discounts, and promo codes" },
  { key: "loyalty", label: "Loyalty & Rewards", description: "Points earned, tier upgrades, and referrals" },
];

export default function PushPreferencePanel({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<PushPreferences>(initialPrefs);
  const [saving, setSaving] = useState<keyof PushPreferences | null>(null);

  async function toggle(key: keyof PushPreferences) {
    const newValue = !prefs[key];
    setSaving(key);
    try {
      await fetch("/api/customer/push-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
      setPrefs((p) => ({ ...p, [key]: newValue }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-1">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Notification Preferences</h3>
      {CATEGORIES.map(({ key, label, description }) => (
        <div key={key} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
          <div>
            <p className="text-sm font-medium text-gray-900">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
          <button
            onClick={() => toggle(key)}
            disabled={saving === key}
            aria-label={`Toggle ${label} notifications`}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              prefs[key] ? "bg-brand-600" : "bg-gray-200"
            } ${saving === key ? "opacity-50" : ""}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                prefs[key] ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
