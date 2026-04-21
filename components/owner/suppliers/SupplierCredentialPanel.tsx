"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupplierCredential, CreateCredentialInput } from "@/types/owner-supplier-credentials";

interface Props {
  supplierId: string;
  credential: SupplierCredential | null;
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

export default function SupplierCredentialPanel({ supplierId, credential }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loginUrl, setLoginUrl] = useState(credential?.loginUrl ?? "");
  const [username, setUsername] = useState(credential?.username ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ msg: string; ok: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      setPassword("");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    if (!credential) return;
    setVerifying(true);
    setVerifyMessage(null);
    try {
      const res = await fetch(`/api/owner/supplier-credentials/${credential.id}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      const result = data.data as { success: boolean; message: string };
      setVerifyMessage({ msg: result.message, ok: result.success });
      if (result.success) router.refresh();
    } catch {
      setVerifyMessage({ msg: "Network error", ok: false });
    } finally {
      setVerifying(false);
    }
  }

  async function handleDelete() {
    if (!credential) return;
    if (!confirm("Delete this credential? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/owner/supplier-credentials/${credential.id}`, { method: "DELETE" });
      router.refresh();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }

  if (credential && !showForm) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                credential.isActive
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {credential.isActive ? "Active" : "Inactive"}
            </span>
            <span className="text-sm text-gray-700">{credential.username}</span>
            {credential.loginUrl && (
              <span className="text-xs text-gray-400 truncate max-w-xs">{credential.loginUrl}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {verifyMessage && (
              <span className={`text-xs ${verifyMessage.ok ? "text-green-600" : "text-red-600"}`}>
                {verifyMessage.msg}
              </span>
            )}
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="text-brand-600 hover:text-brand-800 text-xs font-medium disabled:opacity-50"
            >
              {verifying ? "Testing…" : "Test"}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="text-gray-500 hover:text-gray-700 text-xs font-medium"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400">Last verified: {formatDate(credential.lastVerified)}</p>
      </div>
    );
  }

  if (!showForm && !credential) {
    return (
      <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">No credentials registered for this supplier.</p>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition"
        >
          + Add Credentials
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3"
    >
      <p className="text-xs text-gray-500">
        Your login is encrypted and used only to scrape your personalised pricing.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Login URL <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="url"
            value={loginUrl}
            onChange={(e) => setLoginUrl(e.target.value)}
            placeholder="https://supplier.com/login"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            required={!credential}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={credential ? "Leave blank to keep current" : "••••••••"}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {submitting ? "Saving…" : "Save Credential"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowForm(false);
            setError(null);
          }}
          className="px-4 py-1.5 text-gray-600 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
