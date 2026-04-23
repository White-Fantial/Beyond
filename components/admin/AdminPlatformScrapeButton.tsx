"use client";

import { useState } from "react";

interface ScrapeResult {
  total: number;
  scraped: number;
  changed: number;
  failed: number;
}

export default function AdminPlatformScrapeButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScrape() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/scrape/platform", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Scrape failed");
        return;
      }
      setResult(data.data as ScrapeResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleScrape}
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        {loading ? "Scraping…" : "🔄 Run Platform Scrape"}
      </button>
      {result && (
        <p className="text-xs text-green-700">
          Scraped {result.scraped}/{result.total} products — {result.changed} price
          {result.changed !== 1 ? "s" : ""} updated
          {result.failed > 0 ? `, ${result.failed} failed` : ""}.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
