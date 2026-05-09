"use client";

import { useMemo, useState } from "react";
import type { MenuImportApplyResult, MenuImportPreviewResult } from "@/services/owner/owner-menu-imports.service";

interface Props {
  storeId: string;
  connectionId: string;
  provider: string;
  initialRuns: MenuImportPreviewResult[];
}

function formatPrice(millicents: number): string {
  return `$${(millicents / 100000).toFixed(2)}`;
}

export default function MenuImportPanel({
  storeId,
  connectionId,
  provider,
  initialRuns,
}: Props) {
  const [runs, setRuns] = useState<MenuImportPreviewResult[]>(initialRuns);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(initialRuns[0]?.runId ?? null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [addingToStore, setAddingToStore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<MenuImportApplyResult | null>(null);

  const selectedRun = useMemo(
    () => runs.find((r) => r.runId === selectedRunId) ?? null,
    [runs, selectedRunId]
  );

  async function handleCreatePreview() {
    setLoadingPreview(true);
    setError(null);
    setApplyResult(null);

    try {
      const res = await fetch(`/api/owner/integrations/${connectionId}/menu-imports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overwriteExisting }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create import preview");

      const run = json.data as MenuImportPreviewResult;
      setRuns((prev) => [run, ...prev]);
      setSelectedRunId(run.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleApplyRun() {
    if (!selectedRun) return;

    setApplying(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/owner/integrations/${connectionId}/menu-imports/${selectedRun.runId}/apply`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to apply import run");

      setApplyResult(json.data as MenuImportApplyResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  }

  async function handleAddToStore() {
    if (!applyResult || applyResult.tenantProductIds.length === 0) return;

    setAddingToStore(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/product-selections/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantProductIds: applyResult.tenantProductIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add products to store");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAddingToStore(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-800">Step 1 · Generate Preview</h2>
        <p className="mt-1 text-xs text-gray-500">
          Import current {provider} external products and prepare create/update decisions.
        </p>

        <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={overwriteExisting}
            onChange={(e) => setOverwriteExisting(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Overwrite owner-edited product fields
        </label>

        <div className="mt-3">
          <button
            onClick={handleCreatePreview}
            disabled={loadingPreview}
            className="rounded border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingPreview ? "Creating preview..." : "Create Preview"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-800">Step 2 · Review & Apply</h2>

        {runs.length > 0 ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {runs.map((run) => (
                <button
                  key={run.runId}
                  onClick={() => {
                    setSelectedRunId(run.runId);
                    setApplyResult(null);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${
                    selectedRunId === run.runId
                      ? "border-gray-800 bg-gray-800 text-white"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {new Date(run.createdAt).toLocaleString("en-US")}
                </button>
              ))}
            </div>

            {selectedRun && (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                  <div className="rounded bg-gray-50 p-2">Total: {selectedRun.summary.total}</div>
                  <div className="rounded bg-green-50 p-2 text-green-700">Create: {selectedRun.summary.create}</div>
                  <div className="rounded bg-blue-50 p-2 text-blue-700">Update: {selectedRun.summary.update}</div>
                  <div className="rounded bg-gray-50 p-2">Unchanged: {selectedRun.summary.skipUnchanged}</div>
                  <div className="rounded bg-orange-50 p-2 text-orange-700">Owner changed: {selectedRun.summary.skipOwnerChanged}</div>
                </div>

                <div className="overflow-x-auto rounded border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left">External Product</th>
                        <th className="px-3 py-2 text-left">Price</th>
                        <th className="px-3 py-2 text-left">Action</th>
                        <th className="px-3 py-2 text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {selectedRun.items.slice(0, 200).map((item) => (
                        <tr key={item.externalProductId}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-800">{item.externalName}</div>
                            <div className="text-gray-400">{item.externalProductId}</div>
                          </td>
                          <td className="px-3 py-2 text-gray-700">{formatPrice(item.externalPriceMillicents)}</td>
                          <td className="px-3 py-2">
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                              {item.action}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-500">{item.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleApplyRun}
                  disabled={applying}
                  className="rounded border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {applying ? "Applying..." : "Apply Import Run"}
                </button>
              </>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-500">No preview runs yet.</p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-800">Step 3 · Add Imported Products to Store</h2>
        <p className="mt-1 text-xs text-gray-500">
          After applying a run, bulk-add imported tenant products to this store product list.
        </p>

        {applyResult && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
            <div className="rounded bg-green-50 p-2 text-green-700">Created: {applyResult.appliedCreates}</div>
            <div className="rounded bg-blue-50 p-2 text-blue-700">Updated: {applyResult.appliedUpdates}</div>
            <div className="rounded bg-gray-50 p-2">Skipped: {applyResult.skipped}</div>
            <div className="rounded bg-red-50 p-2 text-red-700">Failed: {applyResult.failed}</div>
            <div className="rounded bg-gray-50 p-2">Products: {applyResult.tenantProductIds.length}</div>
          </div>
        )}

        <div className="mt-3">
          <button
            onClick={handleAddToStore}
            disabled={addingToStore || !applyResult || applyResult.tenantProductIds.length === 0}
            className="rounded border border-gray-700 bg-gray-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {addingToStore ? "Adding..." : "Add Imported Products to Store"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
