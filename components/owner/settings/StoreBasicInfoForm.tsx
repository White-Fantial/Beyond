"use client";

import { useState } from "react";

interface Props {
  storeId: string;
  initial: {
    displayName: string;
    phone: string | null;
    email: string | null;
    addressLine1: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    timezone: string;
  };
}

export default function StoreBasicInfoForm({ storeId, initial }: Props) {
  const [form, setForm] = useState({
    displayName: initial.displayName,
    phone: initial.phone ?? "",
    email: initial.email ?? "",
    addressLine1: initial.addressLine1 ?? "",
    city: initial.city ?? "",
    region: initial.region ?? "",
    postalCode: initial.postalCode ?? "",
    timezone: initial.timezone,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName || undefined,
          phone: form.phone || null,
          email: form.email || null,
          addressLine1: form.addressLine1 || null,
          city: form.city || null,
          region: form.region || null,
          postalCode: form.postalCode || null,
          timezone: form.timezone || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      setMessage({ type: "success", text: "Store info saved." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Display Name" name="displayName" value={form.displayName} onChange={handleChange} />
        <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" />
        <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        <Field label="Address Line 1" name="addressLine1" value={form.addressLine1} onChange={handleChange} />
        <Field label="City" name="city" value={form.city} onChange={handleChange} />
        <Field label="Region / State" name="region" value={form.region} onChange={handleChange} />
        <Field label="Postal Code" name="postalCode" value={form.postalCode} onChange={handleChange} />
        <Field label="Timezone" name="timezone" value={form.timezone} onChange={handleChange} />
      </div>
      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  maxLength,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
    </div>
  );
}
