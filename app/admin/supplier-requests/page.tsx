import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { listSupplierRequests } from "@/services/marketplace/supplier-requests.service";
import {
  SUPPLIER_REQUEST_STATUS_LABELS,
  type SupplierRequestStatus,
} from "@/types/owner-suppliers";
import SupplierRequestReviewPanel from "@/components/admin/SupplierRequestReviewPanel";

export default async function AdminSupplierRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePlatformAdmin();
  const ctx = await getCurrentUserAuthContext();
  const isModOrAdmin = ctx?.isPlatformAdmin || ctx?.isPlatformModerator;
  if (!isModOrAdmin) {
    return <div>Access denied.</div>;
  }

  const { status: statusParam } = await searchParams;
  const status = (statusParam ?? "PENDING") as SupplierRequestStatus;

  const result = await listSupplierRequests({ status, pageSize: 100 });

  const statusTabs: SupplierRequestStatus[] = [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "DUPLICATE",
  ];

  const statusColors: Record<SupplierRequestStatus, string> = {
    PENDING: "bg-blue-100 text-blue-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    DUPLICATE: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Supplier Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Review owner requests to add new suppliers to the platform catalogue.
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6">
        {statusTabs.map((s) => (
          <a
            key={s}
            href={`/admin/supplier-requests?status=${s}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              status === s
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {SUPPLIER_REQUEST_STATUS_LABELS[s]}
          </a>
        ))}
      </div>

      {result.items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">
            No {SUPPLIER_REQUEST_STATUS_LABELS[status].toLowerCase()} requests.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {result.items.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">
                      {req.name}
                    </span>
                  </div>
                  {req.websiteUrl && (
                    <a
                      href={req.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {req.websiteUrl}
                    </a>
                  )}
                  {req.contactEmail && (
                    <p className="text-xs text-gray-500 mt-0.5">{req.contactEmail}</p>
                  )}
                  {req.notes && (
                    <p className="text-xs text-gray-500 italic mt-1">
                      &ldquo;{req.notes}&rdquo;
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                    <span>Requested by: {req.requestedByName}</span>
                    <span>
                      {new Date(req.createdAt).toLocaleDateString("en-US")}
                    </span>
                  </div>
                  {req.reviewNotes && (
                    <p className="mt-1 text-xs text-gray-500">
                      Review notes: {req.reviewNotes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[req.status]
                    }`}
                  >
                    {SUPPLIER_REQUEST_STATUS_LABELS[req.status]}
                  </span>
                  {req.status === "PENDING" && (
                    <SupplierRequestReviewPanel requestId={req.id} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">Total: {result.total}</div>
    </div>
  );
}
