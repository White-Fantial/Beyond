"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  OwnerPlanCatalogItem,
  OwnerPlanChangePreview,
} from "@/types/owner-billing";
import { formatPriceMinor } from "@/lib/billing/labels";
import StatusBadge from "./StatusBadge";

interface Props {
  plans: OwnerPlanCatalogItem[];
  currentPlanCode: string | null;
}

export default function PlanChangeFlow({ plans, currentPlanCode }: Props) {
  const router = useRouter();
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [preview, setPreview] = useState<OwnerPlanChangePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSelect(planCode: string) {
    setSelectedPlanCode(planCode);
    setPreview(null);
    setError(null);
    setSuccess(false);
    setIsLoading(true);
    try {
      const res = await fetch("/api/owner/billing/plans/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlanCode: planCode }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to load preview");
      }
      const data: OwnerPlanChangePreview = await res.json();
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  function handleCancel() {
    setSelectedPlanCode(null);
    setPreview(null);
    setError(null);
  }

  async function handleConfirm() {
    if (!selectedPlanCode) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/billing/plans/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlanCode: selectedPlanCode }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? "Plan change failed");
      }
      setSuccess(true);
      setPreview(null);
      setSelectedPlanCode(null);
      router.push("/owner/billing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center text-green-800">
        <p className="font-semibold">Plan changed successfully!</p>
        <p className="text-sm mt-1">Redirecting to billing overview…</p>
      </div>
    );
  }

  return (
    <div>
      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentPlanCode;
          return (
            <div
              key={plan.code}
              className={`bg-white border rounded-lg p-6 flex flex-col ${
                isCurrent
                  ? "border-brand-400 ring-2 ring-brand-200"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                  )}
                </div>
                {isCurrent && (
                  <StatusBadge label="Current plan" color="green" />
                )}
                {!isCurrent && plan.changeType === "UPGRADE" && (
                  <StatusBadge label="Upgrade" color="blue" />
                )}
                {!isCurrent && plan.changeType === "DOWNGRADE" && (
                  <StatusBadge label="Downgrade" color="gray" />
                )}
              </div>

              <div className="mb-4">
                <span className="text-2xl font-bold text-gray-900">
                  {plan.priceDisplayMonthly}
                </span>
                <span className="text-xs text-gray-400 ml-1">/mo</span>
              </div>

              {plan.limits.length > 0 && (
                <ul className="text-xs text-gray-600 space-y-1 mb-4 flex-1">
                  {plan.limits.map((limit) => (
                    <li key={limit.key} className="flex items-center gap-1">
                      <span className="text-gray-400">•</span>
                      <span>
                        {limit.label}:{" "}
                        <span className="font-medium text-gray-800">
                          {limit.valueInt !== null
                            ? limit.valueInt === -1
                              ? "Unlimited"
                              : String(limit.valueInt)
                            : limit.valueText ?? (limit.valueBool ? "Yes" : "No")}
                          {limit.unit ? ` ${limit.unit}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {plan.features.length > 0 && (
                <ul className="text-xs text-gray-600 space-y-1 mb-4 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat.key} className={feat.enabled ? "text-gray-700" : "text-gray-300 line-through"}>
                      {feat.enabled ? "✓" : "✗"} {feat.label}
                    </li>
                  ))}
                </ul>
              )}

              {isCurrent ? (
                <button
                  disabled
                  className="mt-auto w-full px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                >
                  Current plan
                </button>
              ) : (
                <button
                  onClick={() => handleSelect(plan.code)}
                  disabled={isLoading && selectedPlanCode === plan.code}
                  className="mt-auto w-full px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading && selectedPlanCode === plan.code
                    ? "Loading…"
                    : plan.changeType === "UPGRADE"
                      ? "Upgrade"
                      : "Select"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview panel */}
      {(isLoading || preview || error) && (
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
          {isLoading && (
            <div className="text-sm text-gray-500 text-center py-6">Loading plan preview…</div>
          )}

          {error && !isLoading && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
              {error}
              <button
                onClick={handleCancel}
                className="ml-4 text-xs text-red-700 underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {preview && !isLoading && (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                {preview.changeType === "UPGRADE" ? "Upgrading to" : "Downgrading to"}{" "}
                <span className="text-brand-700">{preview.targetPlan.name}</span>
              </h2>

              {/* Effective mode */}
              <div className="mb-4 text-sm text-gray-600">
                {preview.effectiveMode === "IMMEDIATE"
                  ? "✅ Takes effect immediately"
                  : "🔄 Takes effect at the next billing cycle"}
              </div>

              {/* Blocking reasons */}
              {preview.isBlocked && preview.blockingReasons.length > 0 && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-800 mb-2">
                    ⚠️ Cannot switch — usage exceeds target plan limits:
                  </p>
                  <ul className="space-y-1">
                    {preview.blockingReasons.map((r) => (
                      <li key={r.metricKey} className="text-xs text-red-700">
                        {r.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Feature diffs */}
              {preview.limitDiffs.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Plan comparison
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                            Feature
                          </th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">
                            Current
                          </th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">
                            New
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {preview.limitDiffs.map((diff) => (
                          <tr key={diff.key} className={diff.isReduction ? "bg-red-50" : ""}>
                            <td className="px-3 py-2 text-gray-900">{diff.label}</td>
                            <td className="px-3 py-2 text-center text-gray-500">
                              {diff.currentPlanValue}
                            </td>
                            <td
                              className={`px-3 py-2 text-center font-medium ${
                                diff.isReduction ? "text-red-700" : "text-green-700"
                              }`}
                            >
                              {diff.targetPlanValue}
                              {diff.wouldExceed && (
                                <span className="ml-1 text-red-600">⚠️</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Proration */}
              {preview.prorationDisplayText && (
                <div className="mb-4 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">
                  💰 {preview.prorationDisplayText}
                </div>
              )}

              {/* Summary */}
              <div className="mb-6 text-sm text-gray-700">{preview.summaryText}</div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={preview.isBlocked || isSubmitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Confirming…" : "Confirm Change"}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="mt-3 text-xs text-red-600">{error}</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
