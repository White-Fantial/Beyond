"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FlagScopeType, FlagType } from "@/types/feature-flags";
import { labelFlagScopeType } from "@/lib/flags/labels";

const SCOPE_TYPES: FlagScopeType[] = [
  "GLOBAL",
  "TENANT",
  "STORE",
  "USER",
  "ROLE",
  "PORTAL",
  "PROVIDER",
  "ENVIRONMENT",
  "PERCENTAGE",
];

interface Props {
  flagKey: string;
  flagType: FlagType;
}

export default function AdminFeatureFlagAssignmentDialog({ flagKey, flagType }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scopeType, setScopeType] = useState<FlagScopeType>("GLOBAL");
  const [scopeKey, setScopeKey] = useState("");
  const [boolValue, setBoolValue] = useState<boolean>(true);
  const [stringValue, setStringValue] = useState("");
  const [intValue, setIntValue] = useState("");
  const [priority, setPriority] = useState("0");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        scopeType,
        scopeKey: scopeKey.trim() || undefined,
        priority: parseInt(priority, 10) || 0,
        note: note.trim() || undefined,
      };
      if (flagType === "BOOLEAN") body.boolValue = boolValue;
      else if (flagType === "STRING" || flagType === "VARIANT") body.stringValue = stringValue;
      else if (flagType === "INTEGER") body.intValue = parseInt(intValue, 10);

      const res = await fetch(`/api/admin/feature-flags/${flagKey}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "오류가 발생했습니다.");
        return;
      }
      setOpen(false);
      setScopeType("GLOBAL");
      setScopeKey("");
      setNote("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
      >
        + Assignment 추가
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Assignment 추가</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  범위 타입
                </label>
                <select
                  value={scopeType}
                  onChange={(e) => setScopeType(e.target.value as FlagScopeType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {SCOPE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {labelFlagScopeType(t)}
                    </option>
                  ))}
                </select>
              </div>

              {scopeType !== "GLOBAL" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Scope Key{scopeType === "PERCENTAGE" ? " (0–100)" : " (ID 또는 이름)"}
                  </label>
                  <input
                    value={scopeKey}
                    onChange={(e) => setScopeKey(e.target.value)}
                    placeholder={scopeType === "PERCENTAGE" ? "예: 10" : "예: tenant-uuid"}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">값</label>
                {flagType === "BOOLEAN" && (
                  <select
                    value={String(boolValue)}
                    onChange={(e) => setBoolValue(e.target.value === "true")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="true">true (활성)</option>
                    <option value="false">false (비활성)</option>
                  </select>
                )}
                {(flagType === "STRING" || flagType === "VARIANT") && (
                  <input
                    value={stringValue}
                    onChange={(e) => setStringValue(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="string 값"
                  />
                )}
                {flagType === "INTEGER" && (
                  <input
                    type="number"
                    value={intValue}
                    onChange={(e) => setIntValue(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                )}
                {flagType === "JSON" && (
                  <p className="text-xs text-gray-400">
                    JSON 타입은 API를 통해 직접 설정하세요.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  우선순위
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  노트 (선택)
                </label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="변경 이유 등"
                />
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "저장 중..." : "추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
