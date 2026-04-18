"use client";

/**
 * MappingStatusBadge — displays a coloured badge for a CatalogMappingStatus.
 */

import { MAPPING_STATUS_BADGE, MAPPING_STATUS_LABELS } from "@/lib/catalog/mapping-status";
import type { CatalogMappingStatus } from "@/lib/catalog/mapping-status";

interface Props {
  status: CatalogMappingStatus;
}

export default function MappingStatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${MAPPING_STATUS_BADGE[status] ?? "bg-gray-100 text-gray-500"}`}>
      {MAPPING_STATUS_LABELS[status] ?? status}
    </span>
  );
}
