"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminDialog from "@/components/admin/AdminDialog";
import type { JobType } from "@/types/admin-jobs";
import { JOB_TYPE_LABELS } from "@/lib/admin/jobs/labels";
import { JOB_TYPE_CONFIGS, getAllowedJobTypes } from "@/lib/admin/jobs/guards";

const ALLOWED_JOB_TYPES = getAllowedJobTypes();

interface FormState {
  jobType: JobType;
  tenantId: string;
  storeId: string;
  provider: string;
  relatedEntityId: string;
  notes: string;
}

interface AdminManualJobActionsProps {
  /** Pre-fill tenantId from context (e.g. tenant detail page) */
  defaultTenantId?: string;
  /** Pre-fill storeId from context (e.g. store detail page) */
  defaultStoreId?: string;
}

export default function AdminManualJobActions({
  defaultTenantId,
  defaultStoreId,
}: AdminManualJobActionsProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    jobType: "CATALOG_SYNC",
    tenantId: defaultTenantId ?? "",
    storeId: defaultStoreId ?? "",
    provider: "",
    relatedEntityId: "",
    notes: "",
  });
  const router = useRouter();

  function handleOpen() {
    setError(null);
    setOpen(true);
  }

  function handleChange(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const selectedConfig = JOB_TYPE_CONFIGS[form.jobType];
  const needsConnection = form.jobType === "CONNECTION_VALIDATE" || form.jobType === "CONNECTION_REFRESH_CHECK";

  async function handleSubmit() {
    setError(null);
    if (!selectedConfig) {
      setError("유효하지 않은 작업 유형입니다.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/jobs/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobType: form.jobType,
            tenantId: form.tenantId || undefined,
            storeId: form.storeId || undefined,
            provider: form.provider || undefined,
            relatedEntityId: form.relatedEntityId || undefined,
            relatedEntityType: needsConnection ? "Connection" : undefined,
            notes: form.notes || undefined,
          }),
        });
        const data = (await res.json()) as { id?: string; error?: string };
        if (!res.ok) {
          setError(data.error ?? "실행에 실패했습니다.");
          return;
        }
        setOpen(false);
        router.push(`/admin/jobs/${data.id}`);
        router.refresh();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        <span>▶</span> Manual Run
      </button>

      <AdminDialog open={open} onClose={() => setOpen(false)} title="수동 작업 실행">
        <div className="space-y-4">
          {/* Job type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              작업 유형 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.jobType}
              onChange={(e) => handleChange("jobType", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              {ALLOWED_JOB_TYPES.map((jt) => (
                <option key={jt} value={jt}>
                  {JOB_TYPE_LABELS[jt]}
                </option>
              ))}
            </select>
            {selectedConfig && (
              <p className="mt-1 text-xs text-gray-500">{selectedConfig.description}</p>
            )}
          </div>

          {/* Tenant ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
            <input
              type="text"
              value={form.tenantId}
              onChange={(e) => handleChange("tenantId", e.target.value)}
              placeholder="tenant UUID"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {/* Store ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store ID</label>
            <input
              type="text"
              value={form.storeId}
              onChange={(e) => handleChange("storeId", e.target.value)}
              placeholder="store UUID"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={form.provider}
              onChange={(e) => handleChange("provider", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">선택 안 함</option>
              <option value="LOYVERSE">Loyverse</option>
              <option value="UBER_EATS">Uber Eats</option>
              <option value="DOORDASH">DoorDash</option>
            </select>
          </div>

          {/* Related entity ID (connection/order ID) */}
          {(needsConnection || form.jobType === "ORDER_RECOVERY_RETRY") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {needsConnection ? "Connection ID" : "Order ID"}
              </label>
              <input
                type="text"
                value={form.relatedEntityId}
                onChange={(e) => handleChange("relatedEntityId", e.target.value)}
                placeholder={needsConnection ? "connection UUID" : "order UUID"}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모 (선택)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="이 실행에 대한 메모"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {/* Confirmation message */}
          {selectedConfig && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-xs text-amber-800">{selectedConfig.confirmMessage}</p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-md bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {isPending ? "실행 중…" : "실행"}
            </button>
          </div>
        </div>
      </AdminDialog>
    </div>
  );
}
