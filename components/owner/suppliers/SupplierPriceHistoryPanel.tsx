"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupplierProduct } from "@/types/owner-suppliers";
import type { SupplierPriceRecord, SupplierPriceSource } from "@/types/owner-supplier-prices";

interface Props {
  product: SupplierProduct;
}

interface PriceRecordListResult {
  items: SupplierPriceRecord[];
  total: number;
  page: number;
  pageSize: number;
}

function formatPrice(millicents: number) {
  return `$${(millicents / 100000).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SOURCE_LABELS: Record<SupplierPriceSource, string> = {
  SCRAPED: "Scraped",
  MANUAL_ENTRY: "Manual",
  INVOICE_IMPORT: "Invoice",
};

const SOURCE_COLORS: Record<SupplierPriceSource, string> = {
  SCRAPED: "bg-blue-100 text-blue-700",
  MANUAL_ENTRY: "bg-amber-100 text-amber-700",
  INVOICE_IMPORT: "bg-purple-100 text-purple-700",
};

export default function SupplierPriceHistoryPanel({ product }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [records, setRecords] = useState<SupplierPriceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [manualPrice, setManualPrice] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualSource, setManualSource] = useState<SupplierPriceSource>("MANUAL_ENTRY");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/owner/supplier-products/${product.id}/price-records?pageSize=30`
        );
        const data = await res.json();
        setRecords((data.data as PriceRecordListResult).items ?? []);
        setLoaded(true);
      } catch {
        // silently fail — show empty state
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleAddManual(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const priceFloat = parseFloat(manualPrice);
    if (isNaN(priceFloat) || priceFloat < 0) {
      setFormError("Enter a valid price (e.g. 3.99).");
      return;
    }
    const observedPrice = Math.round(priceFloat * 100000);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/owner/supplier-products/${product.id}/price-records`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            observedPrice,
            source: manualSource,
            notes: manualNotes.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to add price record.");
        return;
      }
      setRecords((prev) => [data.data as SupplierPriceRecord, ...prev]);
      setManualPrice("");
      setManualNotes("");
      setManualSource("MANUAL_ENTRY");
      setShowForm(false);
      router.refresh();
    } catch {
      setFormError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={handleExpand}
        className="w-full flex items-center justify-between px-5 py-3 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium">Price History</span>
        <span>{expanded ? "▲ Hide" : "▼ Show"}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {loaded ? `${records.length} record${records.length !== 1 ? "s" : ""}` : ""}
            </p>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="text-xs font-medium text-brand-600 hover:text-brand-800"
            >
              {showForm ? "✕ Cancel" : "+ Record Manual Price"}
            </button>
          </div>

          {/* Manual price form */}
          {showForm && (
            <form
              onSubmit={handleAddManual}
              className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2"
            >
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">
                    Price ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="3.99"
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">
                    Source
                  </label>
                  <select
                    value={manualSource}
                    onChange={(e) => setManualSource(e.target.value as SupplierPriceSource)}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="MANUAL_ENTRY">Manual Entry</option>
                    <option value="INVOICE_IMPORT">Invoice Import</option>
                    <option value="SCRAPED">Scraped</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="Optional note"
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
              >
                {submitting ? "Saving…" : "Save Price Record"}
              </button>
            </form>
          )}

          {loading ? (
            <p className="text-xs text-gray-400 text-center py-2">Loading…</p>
          ) : records.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">
              No price records yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-gray-50"
                >
                  <span className="font-semibold text-gray-900 w-20 shrink-0">
                    {formatPrice(r.observedPrice)}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${
                      SOURCE_COLORS[r.source]
                    }`}
                  >
                    {SOURCE_LABELS[r.source]}
                  </span>
                  {r.credentialId && (
                    <span className="text-gray-400 shrink-0">🔑</span>
                  )}
                  {r.notes && (
                    <span className="text-gray-400 truncate italic">{r.notes}</span>
                  )}
                  <span className="ml-auto text-gray-400 shrink-0">
                    {formatDate(r.observedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
