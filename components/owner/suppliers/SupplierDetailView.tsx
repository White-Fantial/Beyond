"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupplierDetail, UpsertSupplierProductInput } from "@/types/owner-suppliers";
import type { IngredientUnit } from "@/types/owner-ingredients";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";

interface Props {
  supplier: SupplierDetail;
}

const UNITS = Object.keys(INGREDIENT_UNIT_LABELS) as IngredientUnit[];

function formatPrice(minor: number) {
  return `$${(minor / 100).toFixed(2)}`;
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

export default function SupplierDetailView({ supplier }: Props) {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productUnit, setProductUnit] = useState<IngredientUnit>("EACH");
  const [addingProduct, setAddingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [scrapingAll, setScrapingAll] = useState(false);
  const [scrapeResults, setScrapeResults] = useState<string | null>(null);
  const [scrapingProductId, setScrapingProductId] = useState<string | null>(null);
  const [productScrapeError, setProductScrapeError] = useState<string | null>(null);

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setProductError(null);
    setAddingProduct(true);
    try {
      const body: UpsertSupplierProductInput = {
        name: productName,
        externalUrl: productUrl || undefined,
        unit: productUnit,
      };
      const res = await fetch(`/api/owner/suppliers/${supplier.id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setProductError(data.error ?? "Failed to add product");
        return;
      }
      setProductName("");
      setProductUrl("");
      router.refresh();
    } catch {
      setProductError("Network error. Please try again.");
    } finally {
      setAddingProduct(false);
    }
  }

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
          <button
            onClick={handleScrapeAll}
            disabled={scrapingAll || supplier.products.length === 0}
            className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {scrapingAll ? "Scraping…" : "🔄 Scrape All Prices"}
          </button>
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

      {/* Add product form */}
      <form
        onSubmit={handleAddProduct}
        className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-gray-900">Add Product</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="High Grade Flour 25kg"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Product URL</label>
            <input
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://supplier.com/product"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
            <select
              value={productUnit}
              onChange={(e) => setProductUnit(e.target.value as IngredientUnit)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {INGREDIENT_UNIT_LABELS[u]} ({u})
                </option>
              ))}
            </select>
          </div>
        </div>
        {productError && <p className="text-sm text-red-600">{productError}</p>}
        <button
          type="submit"
          disabled={addingProduct}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {addingProduct ? "Adding…" : "Add Product"}
        </button>
      </form>

      {/* Products table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Products ({supplier.products.length})
          </h3>
        </div>
        {supplier.products.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">No products yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 text-left font-medium">Product</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
                <th className="px-5 py-3 text-left font-medium">Unit</th>
                <th className="px-5 py-3 text-left font-medium">Last Scraped</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {supplier.products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    {product.externalUrl && (
                      <a
                        href={product.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline truncate block max-w-xs"
                      >
                        {product.externalUrl}
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    <div>{formatPrice(product.referencePrice)}</div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {INGREDIENT_UNIT_LABELS[product.unit] ?? product.unit}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {formatDate(product.lastScrapedAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {product.externalUrl && (
                      <button
                        onClick={() => handleScrapeProduct(product.id)}
                        disabled={scrapingProductId === product.id}
                        className="text-brand-600 hover:text-brand-800 text-xs font-medium disabled:opacity-50"
                      >
                        {scrapingProductId === product.id ? "Scraping…" : "Scrape"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {productScrapeError && (
          <p className="mt-2 text-sm text-red-600 px-5 py-2">{productScrapeError}</p>
        )}
      </div>
    </div>
  );
}
