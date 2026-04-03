"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerAddress, CustomerAddressInput } from "@/types/customer";

interface Props {
  /** If provided, the form is in edit mode for this address. */
  editing?: CustomerAddress | null;
  onCancel: () => void;
  onSaved: () => void;
}

const EMPTY: CustomerAddressInput = {
  label: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "NZ",
};

export function AddressForm({ editing, onCancel, onSaved }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<CustomerAddressInput>(
    editing
      ? {
          label: editing.label,
          line1: editing.line1,
          line2: editing.line2 ?? "",
          city: editing.city,
          region: editing.region ?? "",
          postalCode: editing.postalCode ?? "",
          country: editing.country,
        }
      : { ...EMPTY }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: keyof CustomerAddressInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = editing
        ? `/api/customer/addresses/${editing.id}`
        : "/api/customer/addresses";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to save address.");
        return;
      }
      onSaved();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const title = editing ? "Edit Address" : "Add New Address";

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field
          label="Label (e.g. Home, Work)"
          value={form.label ?? ""}
          onChange={(v) => handleChange("label", v)}
          placeholder="Home"
        />
        <Field
          label="Address Line 1"
          value={form.line1}
          onChange={(v) => handleChange("line1", v)}
          placeholder="123 Example Street"
          required
        />
        <Field
          label="Address Line 2"
          value={form.line2 ?? ""}
          onChange={(v) => handleChange("line2", v)}
          placeholder="Apartment, suite, etc."
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="City"
            value={form.city}
            onChange={(v) => handleChange("city", v)}
            placeholder="Auckland"
            required
          />
          <Field
            label="Region"
            value={form.region ?? ""}
            onChange={(v) => handleChange("region", v)}
            placeholder="Auckland"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Postal Code"
            value={form.postalCode ?? ""}
            onChange={(v) => handleChange("postalCode", v)}
            placeholder="1010"
          />
          <Field
            label="Country"
            value={form.country ?? "NZ"}
            onChange={(v) => handleChange("country", v)}
            placeholder="NZ"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="text-xs px-4 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Address"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="text-xs px-4 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
    </div>
  );
}
