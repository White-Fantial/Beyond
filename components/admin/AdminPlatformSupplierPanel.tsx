"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupplierListResult, CreatePlatformSupplierInput } from "@/types/owner-suppliers";
import Link from "next/link";
import AdminPlatformScrapeButton from "@/components/admin/AdminPlatformScrapeButton";

interface Props {
  initialResult: SupplierListResult;
}

export default function AdminPlatformSupplierPanel({ initialResult }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body: CreatePlatformSupplierInput = {
        name,
        websiteUrl: websiteUrl || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        notes: notes || undefined,
      };
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create supplier");
        return;
      }
      setName("");
      setWebsiteUrl("");
      setContactEmail("");
      setContactPhone("");
      setNotes("");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <AdminPlatformScrapeButton />
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700"
        >
          {showForm ? "Cancel" : "+ Add Supplier"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold text-gray-900">New Platform Supplier</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Supplier Ltd"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Website URL</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://supplier.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="orders@supplier.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {submitting ? "Saving…" : "Create Supplier"}
          </button>
        </form>
      )}

      {initialResult.items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          No platform suppliers yet. Add one above.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left font-medium">Supplier</th>
                <th className="px-5 py-3 text-left font-medium">Contact</th>
                <th className="px-5 py-3 text-right font-medium">Products</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialResult.items.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/suppliers/${s.id}`} className="font-medium text-blue-600 hover:underline">
                      {s.name}
                    </Link>
                    {s.websiteUrl && (
                      <a
                        href={s.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {s.websiteUrl}
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {s.contactEmail ?? s.contactPhone ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-700">{s.productCount}</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/suppliers/${s.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
