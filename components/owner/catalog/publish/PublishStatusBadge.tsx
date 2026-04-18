"use client";

/**
 * PublishStatusBadge — displays a coloured badge for a CatalogPublishStatus.
 */

import type { CatalogPublishStatus } from "@/types/catalog-publish";

const BADGE: Record<CatalogPublishStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  RUNNING: "bg-blue-50 text-blue-700",
  SUCCEEDED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  SKIPPED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-gray-100 text-gray-400",
};

const LABEL: Record<CatalogPublishStatus, string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  SKIPPED: "Skipped",
  CANCELLED: "Cancelled",
};

interface Props {
  status: CatalogPublishStatus;
}

export default function PublishStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${BADGE[status] ?? "bg-gray-100 text-gray-500"}`}
    >
      {LABEL[status] ?? status}
    </span>
  );
}
