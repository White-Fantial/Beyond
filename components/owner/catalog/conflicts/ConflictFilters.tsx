"use client";

/**
 * ConflictFilters — filter controls for the conflict center list.
 */

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { CatalogConflictStatus, CatalogConflictType, CatalogEntityType } from "@/types/catalog-conflicts";

const STATUS_OPTIONS: CatalogConflictStatus[] = ["OPEN", "IN_REVIEW", "RESOLVED", "IGNORED", "SUPERSEDED"];
const ENTITY_OPTIONS: CatalogEntityType[] = ["PRODUCT", "CATEGORY", "MODIFIER_GROUP", "MODIFIER_OPTION"];
const CONFLICT_TYPE_OPTIONS: CatalogConflictType[] = [
  "FIELD_VALUE_CONFLICT",
  "STRUCTURE_CONFLICT",
  "MISSING_ON_EXTERNAL",
  "MISSING_ON_INTERNAL",
  "PARENT_RELATION_CONFLICT",
];

export default function ConflictFilters() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className="border border-gray-300 rounded px-2 py-1 text-sm"
        value={searchParams.get("status") ?? ""}
        onChange={(e) => update("status", e.target.value)}
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
        ))}
      </select>

      <select
        className="border border-gray-300 rounded px-2 py-1 text-sm"
        value={searchParams.get("entityType") ?? ""}
        onChange={(e) => update("entityType", e.target.value)}
      >
        <option value="">All entity types</option>
        {ENTITY_OPTIONS.map((t) => (
          <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
        ))}
      </select>

      <select
        className="border border-gray-300 rounded px-2 py-1 text-sm"
        value={searchParams.get("conflictType") ?? ""}
        onChange={(e) => update("conflictType", e.target.value)}
      >
        <option value="">All conflict types</option>
        {CONFLICT_TYPE_OPTIONS.map((t) => (
          <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={searchParams.get("mappedOnly") === "true"}
          onChange={(e) => update("mappedOnly", e.target.checked ? "true" : "")}
        />
        Mapped only
      </label>
    </div>
  );
}
