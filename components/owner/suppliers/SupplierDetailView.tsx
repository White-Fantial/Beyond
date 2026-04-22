"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupplierDetail } from "@/types/owner-suppliers";
import type { SupplierCredential } from "@/types/owner-supplier-credentials";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";
import SupplierCredentialPanel from "./SupplierCredentialPanel";
import SupplierPriceHistoryPanel from "./SupplierPriceHistoryPanel";

interface Props {
  supplier: SupplierDetail;
  credential: SupplierCredential | null;
}

function formatPrice(minor: number) {
  return `$${(minor / 100000).toFixed(2)}`;
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

export default function SupplierDetailView({ supplier, credential }: Props) {
  const router = useRouter();
  const [scrapingAll, setScrapingAll] = useState(false);
  const [scrapeResults, setScrapeResults] = useState<string | null>(null);
  const [scrapingProductId, setScrapingProductId] = useState<string | null>(null);
  const [productScrapeError, setProductScrapeError] = useState<string | null>(null);

  async function handleScrapeAll() {
    setScrapingAll(true);
    setScrapeResults(null);
    try {
      const res = await fetch(`/api/owner/suppliers/${supplier.id}/scrape`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setScrapeResults(`Error: ${data.error ?? "Scrape failed"}`);
        return;
      }
      const results = data.data as { changed: boolean; newPrice: number; previousPrice: number }[];
      const changed = results.filter((r) => r.changed).length;
      setScrapeResults(
        `Scraped ${results.length} product(s). ${changed} price(s) updated.`
      );
      router.refresh();
    } catch {
      setScrapeResults("Network error.");
    } finally {
      setScrapingAll(false);
    }
  }

  async function handleScrapeProduct(productId: string) {
    setScrapingProductId(productId);
    setProductScrapeError(null);
    try {
      const res = await fetch(
        `/api/owner/suppliers/${supplier.id}/products/${productId}/scrape`,
        { method: "POST" }
      );
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setProductScrapeError(data.error ?? "Scrape failed");
      }
    } catch {
      setProductScrapeError("Network error. Please try again.");
    } finally {
      setScrapingProductId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Supplier info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Supplier Info</h2>
          {supplier.products.length > 0 && (
            <button
              onClick={handleScrapeAll}
              disabled={scrapingAll}
              className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {scrapingAll ? "Scraping…" : "🔄 Scrape All Prices"}
            </button>
          )}
        </div>
        {scrapeResults && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            {scrapeResults}
          </p>
        )}
        <dl className="grid grid-cols-2 gap-2 text-sm mt-2">
          {supplier.websiteUrl && (
            <>
              <dt className="text-gray-500">Website</dt>
              <dd>
                <a
                  href={supplier.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  {supplier.websiteUrl}
                </a>
              </dd>
            </>
          )}
          {supplier.contactEmail && (
            <>
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-700">{supplier.contactEmail}</dd>
            </>
          )}
          {supplier.contactPhone && (
            <>
              <dt className="text-gray-500">Phone</dt>
              <dd className="text-gray-700">{supplier.contactPhone}</dd>
            </>
          )}
          {supplier.notes && (
            <>
              <dt className="text-gray-500">Notes</dt>
              <dd className="text-gray-700">{supplier.notes}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Credential management */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">My Credentials</h2>
        <p className="text-xs text-gray-500">
          Register your supplier login to enable personalised price scraping.
        </p>
        <SupplierCredentialPanel supplierId={supplier.id} credential={credential} />
      </div>

      {/* Products list (read-only — admin-managed) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Products ({supplier.products.length})
          </h3>
        </div>
        {supplier.products.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">No products yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {supplier.products.map((product) => (
              <div key={product.id}>
                <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">{product.name}</span>
                      <span className="text-xs text-gray-500">
                        {INGREDIENT_UNIT_LABELS[product.unit] ?? product.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span className="font-medium text-gray-900">{formatPrice(product.referencePrice)}</span>
                      <span>Last scraped: {formatDate(product.lastScrapedAt)}</span>
                    </div>
                    {product.externalUrl && (
                      <a
                        href={product.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline truncate block max-w-xs mt-0.5"
                      >
                        {product.externalUrl}
                      </a>
                    )}
                  </div>
                  {product.externalUrl && (
                    <button
                      onClick={() => handleScrapeProduct(product.id)}
                      disabled={scrapingProductId === product.id}
                      className="text-brand-600 hover:text-brand-800 text-xs font-medium disabled:opacity-50 shrink-0"
                    >
                      {scrapingProductId === product.id ? "Scraping…" : "Scrape"}
                    </button>
                  )}
                </div>
                <SupplierPriceHistoryPanel product={product} />
              </div>
            ))}
          </div>
        )}
        {productScrapeError && (
          <p className="mt-2 text-sm text-red-600 px-5 py-2">{productScrapeError}</p>
        )}
      </div>
    </div>
  );
}
