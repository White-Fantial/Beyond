"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  OwnerInvoiceImportDetail,
  OwnerInvoiceImportRow,
  OwnerInvoiceImportRowStatus,
} from "@/types/owner-invoice-imports";
import type { Supplier } from "@/types/owner-suppliers";
import { INGREDIENT_UNIT_LABELS } from "@/types/owner-ingredients";
import type { IngredientUnit } from "@/types/owner-ingredients";

interface Props {
  suppliers: Supplier[];
  initialSupplierId: string | null;
}

interface RowDraft {
  detectedName: string;
  detectedSku: string;
  detectedQuantity: string;
  detectedUnit: IngredientUnit | "";
  detectedPrice: string;
  supplierProductId: string;
  ingredientId: string;
  platformIngredientId: string;
  createProvisionalIngredient: boolean;
  provisionalIngredientName: string;
}

const STATUS_LABELS: Record<OwnerInvoiceImportRowStatus, string> = {
  MATCHED: "Matched Ingredient",
  PRODUCT_ONLY: "Supplier Product Only",
  PLATFORM_CANDIDATE: "Platform Ingredient Candidate",
  UNMATCHED: "Unmatched",
  INCOMPLETE: "Incomplete",
};

const STATUS_COLORS: Record<OwnerInvoiceImportRowStatus, string> = {
  MATCHED: "bg-green-100 text-green-700",
  PRODUCT_ONLY: "bg-blue-100 text-blue-700",
  PLATFORM_CANDIDATE: "bg-purple-100 text-purple-700",
  UNMATCHED: "bg-red-100 text-red-700",
  INCOMPLETE: "bg-amber-100 text-amber-700",
};

const PROBLEM_STATUSES = new Set<OwnerInvoiceImportRowStatus>([
  "PRODUCT_ONLY",
  "PLATFORM_CANDIDATE",
  "UNMATCHED",
  "INCOMPLETE",
]);

function formatPrice(millicents: number | null): string {
  if (millicents === null) return "";
  return (millicents / 100000).toFixed(2);
}

function toDraft(row: OwnerInvoiceImportRow): RowDraft {
  return {
    detectedName: row.detectedName ?? "",
    detectedSku: row.detectedSku ?? "",
    detectedQuantity: row.detectedQuantity?.toString() ?? "",
    detectedUnit: row.detectedUnit ?? "",
    detectedPrice: formatPrice(row.detectedPrice),
    supplierProductId: row.supplierProductId ?? "",
    ingredientId: row.ingredientId ?? "",
    platformIngredientId: row.platformIngredientId ?? "",
    createProvisionalIngredient: row.createProvisionalIngredient,
    provisionalIngredientName: row.provisionalIngredientName ?? "",
  };
}

export default function OwnerInvoiceImportClient({
  suppliers,
  initialSupplierId,
}: Props) {
  const router = useRouter();
  const [selectedSupplierId, setSelectedSupplierId] = useState(initialSupplierId ?? "");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [detail, setDetail] = useState<OwnerInvoiceImportDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<OwnerInvoiceImportRowStatus | "ALL">("ALL");
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});

  const visibleRows = useMemo(() => {
    if (!detail) return [];
    return detail.rows.filter((row) => {
      if (statusFilter !== "ALL" && row.rowStatus !== statusFilter) return false;
      if (problemsOnly && !PROBLEM_STATUSES.has(row.rowStatus)) return false;
      return true;
    });
  }, [detail, statusFilter, problemsOnly]);

  const summary = useMemo(() => {
    if (!detail) return { matched: 0, provisional: 0, updates: 0, problems: 0 };
    return detail.rows.reduce(
      (acc, row) => {
        if (row.rowStatus === "MATCHED") acc.matched += 1;
        if (row.createProvisionalIngredient) acc.provisional += 1;
        if (row.detectedPrice !== null && row.supplierProductId) acc.updates += 1;
        if (PROBLEM_STATUSES.has(row.rowStatus)) acc.problems += 1;
        return acc;
      },
      { matched: 0, provisional: 0, updates: 0, problems: 0 }
    );
  }, [detail]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplierId) {
      setError("Please select a supplier.");
      return;
    }
    if (!invoiceFile) {
      setError("Please upload an invoice file.");
      return;
    }

    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("supplierId", selectedSupplierId);
      formData.set("invoiceFile", invoiceFile);
      const res = await fetch("/api/owner/invoice-imports", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create invoice import.");
        return;
      }
      const nextDetail = json.data as OwnerInvoiceImportDetail;
      setDetail(nextDetail);
      setDrafts(
        Object.fromEntries(nextDetail.rows.map((row) => [row.id, toDraft(row)]))
      );
      setMessage("Invoice parsed. Review rows before applying updates.");
      router.replace(`/owner/suppliers/import-invoice?supplierId=${selectedSupplierId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function saveRow(row: OwnerInvoiceImportRow) {
    if (!detail) return;
    const draft = drafts[row.id] ?? toDraft(row);
    setSavingRowId(row.id);
    setError(null);
    setMessage(null);
    try {
      const detectedPrice =
        draft.detectedPrice.trim() === ""
          ? null
          : Math.round(Number(draft.detectedPrice) * 100000);
      const detectedQuantity =
        draft.detectedQuantity.trim() === "" ? null : Number(draft.detectedQuantity);
      if (detectedPrice !== null && (!Number.isFinite(detectedPrice) || detectedPrice < 0)) {
        setError("Price must be a valid non-negative number.");
        return;
      }
      if (detectedQuantity !== null && (!Number.isFinite(detectedQuantity) || detectedQuantity <= 0)) {
        setError("Quantity must be a valid positive number.");
        return;
      }

      const payload = {
        detectedName: draft.detectedName.trim() || null,
        detectedSku: draft.detectedSku.trim() || null,
        detectedQuantity,
        detectedUnit: draft.detectedUnit || null,
        detectedPrice,
        supplierProductId: draft.supplierProductId || null,
        ingredientId:
          draft.createProvisionalIngredient || draft.platformIngredientId
            ? null
            : draft.ingredientId || null,
        platformIngredientId:
          draft.createProvisionalIngredient || draft.ingredientId
            ? null
            : draft.platformIngredientId || null,
        createProvisionalIngredient: draft.createProvisionalIngredient,
        provisionalIngredientName: draft.provisionalIngredientName.trim() || null,
      };

      const res = await fetch(
        `/api/owner/invoice-imports/${detail.batch.id}/rows/${row.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to save row.");
        return;
      }

      const updatedRow = json.data as OwnerInvoiceImportRow;
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              rows: prev.rows.map((existing) =>
                existing.id === row.id ? updatedRow : existing
              ),
            }
          : prev
      );
      setDrafts((prev) => ({ ...prev, [row.id]: toDraft(updatedRow) }));
      setMessage(`Row #${row.rowNumber} saved.`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSavingRowId(null);
    }
  }

  async function handleApply() {
    if (!detail) return;
    if (!confirm("Apply invoice price updates now?")) return;
    setApplyLoading(true);
    setError(null);
    setMessage(null);
    try {
      const applyRes = await fetch(
        `/api/owner/invoice-imports/${detail.batch.id}/apply`,
        { method: "POST" }
      );
      const applyJson = await applyRes.json();
      if (!applyRes.ok) {
        setError(applyJson.error ?? "Failed to apply invoice import.");
        return;
      }
      const detailRes = await fetch(`/api/owner/invoice-imports/${detail.batch.id}`);
      const detailJson = await detailRes.json();
      if (!detailRes.ok) {
        setError(detailJson.error ?? "Applied but failed to refresh preview.");
        return;
      }
      const refreshed = detailJson.data as OwnerInvoiceImportDetail;
      setDetail(refreshed);
      setDrafts(Object.fromEntries(refreshed.rows.map((row) => [row.id, toDraft(row)])));
      setMessage("Invoice import applied. Price records were added with source Invoice Import.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setApplyLoading(false);
    }
  }

  async function handleAddManualRow() {
    if (!detail) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/invoice-imports/${detail.batch.id}/rows`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to add manual row.");
        return;
      }
      const newRow = json.data as OwnerInvoiceImportRow;
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              rows: [...prev.rows, newRow].sort((a, b) => a.rowNumber - b.rowNumber),
            }
          : prev
      );
      setDrafts((prev) => ({ ...prev, [newRow.id]: toDraft(newRow) }));
      setMessage(`Row #${newRow.rowNumber} added for manual entry.`);
    } catch {
      setError("Network error. Please try again.");
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleUpload}
        className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Supplier <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Invoice File (image / PDF / text)
            </label>
            <input
              type="file"
              accept=".csv,.txt,.pdf,image/*"
              onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50"
        >
          {creating ? "Parsing…" : "Upload & Preview"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      {detail && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Preview Summary</h2>
            <p className="text-xs text-gray-500">
              File: {detail.batch.sourceFileName} ({detail.rows.length} rows)
            </p>
            {detail.batch.extractionNote && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                {detail.batch.extractionNote}
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <div className="text-gray-400">Rows ready for update</div>
                <div className="font-semibold text-gray-900">{summary.updates}</div>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <div className="text-gray-400">Matched</div>
                <div className="font-semibold text-green-700">{summary.matched}</div>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <div className="text-gray-400">Problem rows</div>
                <div className="font-semibold text-red-700">{summary.problems}</div>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <div className="text-gray-400">Create provisional ingredients</div>
                <div className="font-semibold text-purple-700">{summary.provisional}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter((e.target.value || "ALL") as OwnerInvoiceImportRowStatus | "ALL")
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="ALL">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={problemsOnly}
                onChange={(e) => setProblemsOnly(e.target.checked)}
                className="h-4 w-4"
              />
              Show problem rows only
            </label>
            <button
              type="button"
              onClick={handleAddManualRow}
              className="ml-auto px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              + Add Manual Row
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applyLoading}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {applyLoading ? "Applying…" : "Confirm & Apply"}
            </button>
          </div>

          <div className="space-y-3">
            {visibleRows.length === 0 && (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No rows in this filter. Add a manual row to continue invoice review.
              </div>
            )}
            {visibleRows.map((row) => {
              const draft = drafts[row.id] ?? toDraft(row);
              return (
                <div key={row.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400">Row #{row.rowNumber}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.rowStatus]}`}>
                      {STATUS_LABELS[row.rowStatus]}
                    </span>
                    <span className="text-xs text-gray-400">Confidence: {row.confidence}%</span>
                    {row.matchReason && (
                      <span className="text-xs text-gray-500">{row.matchReason}</span>
                    )}
                    {row.applyStatus !== "PENDING" && (
                      <span className="ml-auto text-xs text-gray-500">Apply: {row.applyStatus}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={draft.detectedName}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: { ...draft, detectedName: e.target.value },
                        }))
                      }
                      placeholder="Product name"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={draft.detectedSku}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: { ...draft, detectedSku: e.target.value },
                        }))
                      }
                      placeholder="SKU / code"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <select
                      value={draft.supplierProductId}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: { ...draft, supplierProductId: e.target.value },
                        }))
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">No supplier product</option>
                      {detail.supplierProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={draft.detectedQuantity}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: { ...draft, detectedQuantity: e.target.value },
                        }))
                      }
                      placeholder="Quantity"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <select
                      value={draft.detectedUnit}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: {
                            ...draft,
                            detectedUnit: (e.target.value || "") as IngredientUnit | "",
                          },
                        }))
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">No unit</option>
                      {Object.entries(INGREDIENT_UNIT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.detectedPrice}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: { ...draft, detectedPrice: e.target.value },
                        }))
                      }
                      placeholder="Price ($)"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <select
                      value={draft.ingredientId}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: {
                            ...draft,
                            ingredientId: e.target.value,
                            platformIngredientId: e.target.value ? "" : draft.platformIngredientId,
                            createProvisionalIngredient: e.target.value ? false : draft.createProvisionalIngredient,
                          },
                        }))
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">No active ingredient selected</option>
                      {detail.activeIngredients.map((ingredient) => (
                        <option key={ingredient.id} value={ingredient.id}>
                          {ingredient.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={draft.platformIngredientId}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: {
                            ...draft,
                            platformIngredientId: e.target.value,
                            ingredientId: e.target.value ? "" : draft.ingredientId,
                            createProvisionalIngredient: e.target.value ? false : draft.createProvisionalIngredient,
                          },
                        }))
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">No platform ingredient candidate</option>
                      {detail.platformIngredients.map((ingredient) => (
                        <option key={ingredient.id} value={ingredient.id}>
                          {ingredient.name}
                        </option>
                      ))}
                    </select>
                    <div className="space-y-2">
                      <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={draft.createProvisionalIngredient}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...draft,
                                createProvisionalIngredient: e.target.checked,
                                ingredientId: e.target.checked ? "" : draft.ingredientId,
                                platformIngredientId: e.target.checked ? "" : draft.platformIngredientId,
                              },
                            }))
                          }
                        />
                        Create new provisional ingredient for this row
                      </label>
                      {draft.createProvisionalIngredient && (
                        <input
                          type="text"
                          value={draft.provisionalIngredientName}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...draft,
                                provisionalIngredientName: e.target.value,
                              },
                            }))
                          }
                          placeholder="New ingredient name"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      )}
                    </div>
                  </div>

                  {row.applyError && <p className="text-xs text-red-600">{row.applyError}</p>}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => saveRow(row)}
                      disabled={savingRowId === row.id}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {savingRowId === row.id ? "Saving…" : "Save Row"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
