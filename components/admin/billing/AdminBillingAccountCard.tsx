"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TenantBillingAccountData } from "@/types/admin-billing";

interface Props {
  billingAccount: TenantBillingAccountData | null;
  tenantId: string;
}

export default function AdminBillingAccountCard({ billingAccount, tenantId }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    billingEmail: billingAccount?.billingEmail ?? "",
    companyName: billingAccount?.companyName ?? "",
    legalName: billingAccount?.legalName ?? "",
    taxNumber: billingAccount?.taxNumber ?? "",
    addressLine1: billingAccount?.addressLine1 ?? "",
    city: billingAccount?.city ?? "",
    region: billingAccount?.region ?? "",
    postalCode: billingAccount?.postalCode ?? "",
    countryCode: billingAccount?.countryCode ?? "",
    externalCustomerRef: billingAccount?.externalCustomerRef ?? "",
    notes: billingAccount?.notes ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          billingEmail: form.billingEmail || undefined,
          companyName: form.companyName || null,
          legalName: form.legalName || null,
          taxNumber: form.taxNumber || null,
          addressLine1: form.addressLine1 || null,
          city: form.city || null,
          region: form.region || null,
          postalCode: form.postalCode || null,
          countryCode: form.countryCode || null,
          externalCustomerRef: form.externalCustomerRef || null,
          notes: form.notes || null,
        };
        const res = await fetch(`/api/admin/billing/tenants/${tenantId}/account`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to save.");
          return;
        }
        setEditing(false);
        router.refresh();
      } catch {
        setError("A network error occurred.");
      }
    });
  }

  if (!editing) {
    return (
      <div>
        {billingAccount ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8 text-sm">
            {[
              { label: "Billing Email", value: billingAccount.billingEmail },
              { label: "Company Name", value: billingAccount.companyName },
              { label: "Legal Name", value: billingAccount.legalName },
              { label: "Business Registration No.", value: billingAccount.taxNumber },
              { label: "Address", value: billingAccount.addressLine1 },
              { label: "City", value: billingAccount.city },
              { label: "Region", value: billingAccount.region },
              { label: "Postal Code", value: billingAccount.postalCode },
              { label: "Country Code", value: billingAccount.countryCode },
              { label: "External Customer ID", value: billingAccount.externalCustomerRef },
            ]
              .filter((item) => item.value)
              .map((item) => (
                <div key={item.label}>
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <div className="font-medium text-gray-900">{item.value}</div>
                </div>
              ))}
            {billingAccount.notes && (
              <div className="col-span-2">
                <span className="text-xs text-gray-500">Internal Note</span>
                <div className="text-sm text-gray-600">{billingAccount.notes}</div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No billing account info.</p>
        )}
        <button
          onClick={() => setEditing(true)}
          className="mt-4 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          {billingAccount ? "Edit Billing Account" : "Register Billing Account"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { name: "billingEmail", label: "Billing Email *", type: "email" },
          { name: "companyName", label: "Company Name", type: "text" },
          { name: "legalName", label: "Legal Name", type: "text" },
          { name: "taxNumber", label: "Business Registration No.", type: "text" },
          { name: "addressLine1", label: "Address", type: "text" },
          { name: "city", label: "City", type: "text" },
          { name: "region", label: "Region", type: "text" },
          { name: "postalCode", label: "Postal Code", type: "text" },
          { name: "countryCode", label: "Country Code (e.g. NZ)", type: "text" },
          { name: "externalCustomerRef", label: "External Customer ID (e.g. Stripe cus_...)", type: "text" },
        ].map((field) => (
          <div key={field.name}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{field.label}</label>
            <input
              name={field.name}
              type={field.type}
              value={form[field.name as keyof typeof form]}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Internal Note</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => { setEditing(false); setError(null); }}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
