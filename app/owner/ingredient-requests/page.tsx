import { requireAuth } from "@/lib/auth/permissions";
import { getTenantIngredientRequests } from "@/services/marketplace/ingredient-requests.service";
import { INGREDIENT_REQUEST_STATUS_LABELS } from "@/types/marketplace";
import type { IngredientRequestStatus } from "@/types/marketplace";
import RequestIngredientPanel from "@/components/owner/ingredients/RequestIngredientPanel";
import MarkIngredientRequestsSeen from "@/components/owner/ingredients/MarkIngredientRequestsSeen";

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
      {/* Mark all unseen reviewed requests as seen when the owner visits this page */}
      <MarkIngredientRequestsSeen />

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

                  {/* PENDING — temp ingredient note */}
                  {req.status === "PENDING" && req.tempIngredientId && (
                    <p className="mt-1 text-xs text-blue-600">
                      ✓ A temporary ingredient is available to use in recipes right now.
                    </p>
                  )}

                  {/* APPROVED — show which platform ingredient was created */}
                  {req.status === "APPROVED" && req.resolvedIngredientName && (
                    <p className="mt-1 text-xs text-green-700">
                      ✓ Your recipes now use the platform ingredient:{" "}
                      <span className="font-medium">{req.resolvedIngredientName}</span>
                    </p>
                  )}

                  {/* DUPLICATE — show which existing platform ingredient was matched */}
                  {req.status === "DUPLICATE" && req.resolvedIngredientName && (
                    <p className="mt-1 text-xs text-gray-700">
                      This ingredient already exists as:{" "}
                      <span className="font-medium">{req.resolvedIngredientName}</span>. Your recipes
                      have been updated.
                    </p>
                  )}

                  {/* REJECTED — with replacement: auto-migrated */}
                  {req.status === "REJECTED" && req.resolvedIngredientId && req.resolvedIngredientName && (
                    <p className="mt-1 text-xs text-orange-700">
                      Request rejected. Your recipes have been updated to use:{" "}
                      <span className="font-medium">{req.resolvedIngredientName}</span>
                    </p>
                  )}

                  {/* REJECTED — without replacement: manual action needed */}
                  {req.status === "REJECTED" && !req.resolvedIngredientId && req.tempIngredientId && (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-red-700">
                        Request rejected. The temporary ingredient is no longer active. Please update
                        your recipes manually.
                      </p>
                      <a
                        href={`/owner/recipes?ingredient=${req.tempIngredientId}`}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        View affected recipes →
                      </a>
                    </div>
                  )}

                  {/* REJECTED — review notes (reason) */}
                  {req.status === "REJECTED" && req.reviewNotes && (
                    <p className="mt-1 text-xs text-red-600">
                      <span className="font-medium">Rejection reason:</span> {req.reviewNotes}
                    </p>
                  )}

                  {/* DUPLICATE — review notes */}
                  {req.status === "DUPLICATE" && req.reviewNotes && (
                    <p className="mt-1 text-xs text-gray-600">
                      <span className="font-medium">Note:</span> {req.reviewNotes}
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
