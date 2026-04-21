import { requireAuth } from "@/lib/auth/permissions";
import { getTenantSupplierRequests } from "@/services/marketplace/supplier-requests.service";
import {
  SUPPLIER_REQUEST_STATUS_LABELS,
  type SupplierRequestStatus,
} from "@/types/owner-suppliers";
import OwnerSupplierRequestForm from "@/components/owner/suppliers/OwnerSupplierRequestForm";

const statusColors: Record<SupplierRequestStatus, string> = {
  PENDING: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  DUPLICATE: "bg-gray-100 text-gray-600",
};

export default async function OwnerSupplierRequestsPage() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const result = await getTenantSupplierRequests(tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Supplier Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Request new suppliers to be added to the platform. A moderator will review
          your request.
        </p>
      </div>

      <OwnerSupplierRequestForm />

      {result.items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          <p className="text-2xl mb-2">📬</p>
          <p>No supplier requests yet.</p>
          <p className="mt-1 text-xs">Submit a request above to have a supplier added.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {result.items.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm">{req.name}</div>
                  {req.websiteUrl && (
                    <a
                      href={req.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:underline"
                    >
                      {req.websiteUrl}
                    </a>
                  )}
                  {req.notes && (
                    <p className="text-xs text-gray-500 italic mt-1">
                      &ldquo;{req.notes}&rdquo;
                    </p>
                  )}
                  {req.reviewNotes && (
                    <p className="text-xs text-gray-600 mt-1">
                      Moderator note: {req.reviewNotes}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(req.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    statusColors[req.status]
                  }`}
                >
                  {SUPPLIER_REQUEST_STATUS_LABELS[req.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-400">Total: {result.total}</div>
    </div>
  );
}
