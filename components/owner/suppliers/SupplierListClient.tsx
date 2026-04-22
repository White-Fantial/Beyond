"use client";

import { useState } from "react";
import Link from "next/link";
import type { Supplier } from "@/types/owner-suppliers";
import type { SupplierCredential } from "@/types/owner-supplier-credentials";
import SupplierCredentialPanel from "@/components/owner/suppliers/SupplierCredentialPanel";

interface Props {
  suppliers: Supplier[];
  credentials: SupplierCredential[];
}

export default function SupplierListClient({ suppliers, credentials }: Props) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const credentialBySupplierId = Object.fromEntries(
    credentials.map((c) => [c.supplierId, c])
  );

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.websiteUrl ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers…"
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          <p className="text-2xl mb-2">🚚</p>
          {search ? (
            <p>No suppliers match &ldquo;{search}&rdquo;.</p>
          ) : (
            <>
              <p>No suppliers available yet.</p>
              <p className="mt-1">
                <Link href="/owner/supplier-requests" className="text-brand-600 hover:underline">
                  Request a supplier
                </Link>{" "}
                to have it added to the platform.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left font-medium">Supplier</th>
                <th className="px-5 py-3 text-left font-medium">Contact</th>
                <th className="px-5 py-3 text-right font-medium">Products</th>
                <th className="px-5 py-3 text-center font-medium">Credentials</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((supplier) => {
                const cred = credentialBySupplierId[supplier.id] ?? null;
                const isExpanded = expandedId === supplier.id;
                return (
                  <SupplierRow
                    key={supplier.id}
                    supplier={supplier}
                    credential={cred}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : supplier.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  supplier: Supplier;
  credential: SupplierCredential | null;
  isExpanded: boolean;
  onToggle: () => void;
}

function SupplierRow({ supplier, credential, isExpanded, onToggle }: RowProps) {
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-5 py-3">
          <Link href={`/owner/suppliers/${supplier.id}`} className="font-medium text-brand-700 hover:text-brand-900 hover:underline">
            {supplier.name}
          </Link>
          {supplier.websiteUrl && (
            <a
              href={supplier.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:underline"
            >
              {supplier.websiteUrl}
            </a>
          )}
        </td>
        <td className="px-5 py-3 text-gray-600">
          {supplier.contactEmail ?? supplier.contactPhone ?? "—"}
        </td>
        <td className="px-5 py-3 text-right text-gray-700">
          {supplier.productCount}
        </td>
        <td className="px-5 py-3 text-center">
          {credential ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
              ✓ Active
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              None
            </span>
          )}
        </td>
        <td className="px-5 py-3 text-right space-x-3 whitespace-nowrap">
          <button
            onClick={onToggle}
            className="text-brand-600 hover:text-brand-800 text-xs font-medium"
          >
            {isExpanded ? "Hide" : (credential ? "Credentials" : "Add Credentials")}
          </button>
          <Link
            href={`/owner/suppliers/${supplier.id}`}
            className="text-gray-500 hover:text-gray-700 text-xs font-medium"
          >
            Products →
          </Link>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <td colSpan={5} className="px-5 py-3">
            <SupplierCredentialPanel
              supplierId={supplier.id}
              credential={credential}
            />
          </td>
        </tr>
      )}
    </>
  );
}
