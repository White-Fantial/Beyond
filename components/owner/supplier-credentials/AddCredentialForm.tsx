"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateCredentialInput } from "@/types/owner-supplier-credentials";

interface Supplier {
  id: string;
  name: string;
}

interface Props {
  suppliers: Supplier[];
}

export default function AddCredentialForm({ suppliers }: Props) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supplierId) {
      setError("Please select a supplier");
      return;
    }
    setSubmitting(true);
    try {
      const body: CreateCredentialInput = {
        supplierId,
        loginUrl: loginUrl || undefined,
        username,
        password,
      };
      const res = await fetch("/api/owner/supplier-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save credential");
        return;
      }
      setSupplierId("");
      setLoginUrl("");
      setUsername("");
      setPassword("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
    >
      <h2 className="text-sm font-semibold text-gray-900">Add Supplier Account</h2>
      <p className="text-xs text-gray-500">
        Your login credentials are encrypted at rest and used only to scrape your
        personalised prices from the supplier&apos;s website.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Supplier <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Select a supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Login URL <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="url"
            value={loginUrl}
            onChange={(e) => setLoginUrl(e.target.value)}
            placeholder="https://supplier.com/login"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Username / Email <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
      >
        {submitting ? "Saving…" : "Save Credential"}
      </button>
    </form>
  );
}
