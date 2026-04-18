"use client";

/**
 * MappingActions — action buttons for a single mapping row.
 */

import { useRouter } from "next/navigation";
import type { MappingWithNames } from "@/types/catalog-mapping";

interface Props {
  mapping: MappingWithNames;
}

export default function MappingActions({ mapping }: Props) {
  const router = useRouter();

  async function approve() {
    await fetch("/api/catalog/mappings/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mappingId: mapping.id }),
    });
    router.refresh();
  }

  async function unlink() {
    const reason = prompt("Reason for unlinking? (optional)");
    await fetch("/api/catalog/mappings/unlink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mappingId: mapping.id, reason: reason ?? undefined }),
    });
    router.refresh();
  }

  if (mapping.status === "ARCHIVED") return null;

  return (
    <div className="flex items-center gap-2">
      {mapping.status === "NEEDS_REVIEW" && (
        <button
          onClick={approve}
          className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
        >
          Approve
        </button>
      )}
      {(mapping.status === "ACTIVE" || mapping.status === "NEEDS_REVIEW") && (
        <button
          onClick={unlink}
          className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          Unlink
        </button>
      )}
    </div>
  );
}
