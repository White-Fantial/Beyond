"use client";

/**
 * ExternalChangeFilters — filter controls for the external changes list.
 */

import { useRouter, useSearchParams } from "next/navigation";
import type { CatalogEntityType, ExternalCatalogChangeKind, ExternalCatalogChangeStatus } from "@/types/catalog-external-changes";

const ENTITY_TYPES: Array<{ label: string; value: CatalogEntityType | "" }> = [
  { label: "All Types", value: "" },
  { label: "Products", value: "PRODUCT" },
  { label: "Categories", value: "CATEGORY" },
  { label: "Modifier Groups", value: "MODIFIER_GROUP" },
  { label: "Modifier Options", value: "MODIFIER_OPTION" },
];

const CHANGE_KINDS: Array<{ label: string; value: ExternalCatalogChangeKind | "" }> = [
  { label: "All Changes", value: "" },
  { label: "Created", value: "CREATED" },
  { label: "Updated", value: "UPDATED" },
  { label: "Deleted", value: "DELETED" },
  { label: "Relinked", value: "RELINKED" },
  { label: "Structure", value: "STRUCTURE_UPDATED" },
];

const STATUSES: Array<{ label: string; value: ExternalCatalogChangeStatus | "" }> = [
  { label: "All Statuses", value: "" },
  { label: "Open", value: "OPEN" },
  { label: "Acknowledged", value: "ACKNOWLEDGED" },
  { label: "Ignored", value: "IGNORED" },
  { label: "Superseded", value: "SUPERSEDED" },
];

export default function ExternalChangeFilters() {
  const router = useRouter();
  const sp = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push("?" + params.toString());
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={sp.get("entityType") ?? ""}
        onChange={(e) => setParam("entityType", e.target.value)}
        className="border rounded px-3 py-1.5 text-sm text-gray-700 bg-white"
      >
        {ENTITY_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <select
        value={sp.get("changeKind") ?? ""}
        onChange={(e) => setParam("changeKind", e.target.value)}
        className="border rounded px-3 py-1.5 text-sm text-gray-700 bg-white"
      >
        {CHANGE_KINDS.map((k) => (
          <option key={k.value} value={k.value}>{k.label}</option>
        ))}
      </select>

      <select
        value={sp.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="border rounded px-3 py-1.5 text-sm text-gray-700 bg-white"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={sp.get("mappedOnly") === "true"}
          onChange={(e) => setParam("mappedOnly", e.target.checked ? "true" : "")}
          className="rounded"
        />
        Mapped only
      </label>
    </div>
  );
}
