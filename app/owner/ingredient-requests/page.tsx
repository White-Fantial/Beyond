import { requireAuth } from "@/lib/auth/permissions";
import { getTenantIngredientRequests } from "@/services/marketplace/ingredient-requests.service";
import { INGREDIENT_REQUEST_STATUS_LABELS } from "@/types/marketplace";
import type { IngredientRequestStatus } from "@/types/marketplace";
import RequestIngredientPanel from "@/components/owner/ingredients/RequestIngredientPanel";

const statusColors: Record<IngredientRequestStatus, string> = {
  PENDING: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  DUPLICATE: "bg-gray-100 text-gray-600",
};

export default async function OwnerIngredientRequestsPage() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const result = await getTenantIngredientRequests(tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ingredient Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Request new ingredients to be added to the platform catalogue. A temporary ingredient
          is created immediately for use in recipes while the request is under review.
        </p>
      </div>

      <RequestIngredientPanel />

      {result.items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          <p className="text-2xl mb-2">🌿</p>
          <p>No ingredient requests yet.</p>
          <p className="mt-1 text-xs">Submit a request above to have a new ingredient added to the platform.</p>
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">{req.name}</span>
                    {req.category && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {req.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{req.unit}</span>
                  </div>
                  {req.description && (
                    <p className="text-xs text-gray-500 mb-1">{req.description}</p>
                  )}
                  {req.notes && (
                    <p className="text-xs text-gray-500 italic">&ldquo;{req.notes}&rdquo;</p>
                  )}
                  {req.status === "REJECTED" && req.reviewNotes && (
                    <p className="mt-1 text-xs text-red-600">
                      <span className="font-medium">Rejection reason:</span> {req.reviewNotes}
                    </p>
                  )}
                  {req.status === "DUPLICATE" && req.reviewNotes && (
                    <p className="mt-1 text-xs text-gray-600">
                      <span className="font-medium">Note:</span> {req.reviewNotes}
                    </p>
                  )}
                  {req.status === "PENDING" && req.tempIngredientId && (
                    <p className="mt-1 text-xs text-blue-600">
                      ✓ A temporary ingredient is available to use in recipes right now.
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(req.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    statusColors[req.status]
                  }`}
                >
                  {INGREDIENT_REQUEST_STATUS_LABELS[req.status]}
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
