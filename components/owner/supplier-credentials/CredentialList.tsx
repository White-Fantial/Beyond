"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupplierCredential } from "@/types/owner-supplier-credentials";

interface Props {
  credentials: SupplierCredential[];
}

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CredentialList({ credentials }: Props) {
  const router = useRouter();
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleVerify(id: string) {
    setVerifying(id);
    setVerifyMessage(null);
    try {
      const res = await fetch(`/api/owner/supplier-credentials/${id}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      const result = data.data as { success: boolean; message: string };
      setVerifyMessage({ id, msg: result.message, ok: result.success });
      if (result.success) router.refresh();
    } catch {
      setVerifyMessage({ id, msg: "Network error", ok: false });
    } finally {
      setVerifying(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this credential? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await fetch(`/api/owner/supplier-credentials/${id}`, { method: "DELETE" });
      router.refresh();
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }

  async function handleScrapeNow() {
    await fetch("/api/owner/scrape/user", { method: "POST" });
    router.refresh();
  }

  if (credentials.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
        No supplier accounts registered yet. Add one above.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Registered Accounts ({credentials.length})
        </h3>
        <button
          onClick={handleScrapeNow}
          className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
        >
          🔄 Scrape My Prices Now
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            <th className="px-5 py-3 text-left font-medium">Supplier</th>
            <th className="px-5 py-3 text-left font-medium">Username</th>
            <th className="px-5 py-3 text-left font-medium">Status</th>
            <th className="px-5 py-3 text-left font-medium">Last Verified</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {credentials.map((cred) => (
            <tr key={cred.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-5 py-3">
                <div className="font-medium text-gray-900">{cred.supplierName}</div>
                {cred.loginUrl && (
                  <div className="text-xs text-gray-400 truncate max-w-xs">{cred.loginUrl}</div>
                )}
              </td>
              <td className="px-5 py-3 text-gray-600">{cred.username}</td>
              <td className="px-5 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    cred.isActive
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {cred.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-5 py-3 text-gray-500 text-xs">
                {formatDate(cred.lastVerified)}
              </td>
              <td className="px-5 py-3 text-right space-x-3">
                {verifyMessage?.id === cred.id && (
                  <span
                    className={`text-xs ${verifyMessage.ok ? "text-green-600" : "text-red-600"}`}
                  >
                    {verifyMessage.msg}
                  </span>
                )}
                <button
                  onClick={() => handleVerify(cred.id)}
                  disabled={verifying === cred.id}
                  className="text-brand-600 hover:text-brand-800 text-xs font-medium disabled:opacity-50"
                >
                  {verifying === cred.id ? "Testing…" : "Test"}
                </button>
                <button
                  onClick={() => handleDelete(cred.id)}
                  disabled={deleting === cred.id}
                  className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
