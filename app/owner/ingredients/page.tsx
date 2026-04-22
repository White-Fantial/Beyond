import { requireAuth } from "@/lib/auth/permissions";
import { listIngredients } from "@/services/owner/owner-ingredients.service";
import { getTenantIngredientRequests } from "@/services/marketplace/ingredient-requests.service";
import IngredientTable from "@/components/owner/ingredients/IngredientTable";
import ImportPlatformIngredientPanel from "@/components/owner/ingredients/ImportPlatformIngredientPanel";
import RequestIngredientPanel from "@/components/owner/ingredients/RequestIngredientPanel";
import { INGREDIENT_REQUEST_STATUS_LABELS } from "@/types/marketplace";
import type { IngredientRequestStatus } from "@/types/marketplace";

const statusColors: Record<IngredientRequestStatus, string> = {
  PENDING: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  DUPLICATE: "bg-gray-100 text-gray-600",
};

export default async function OwnerIngredientsPage() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const storeId = ctx.storeMemberships[0]?.storeId ?? "";

  const [result, requestsResult] = await Promise.all([
    listIngredients(tenantId, { storeId }),
    getTenantIngredientRequests(tenantId),
  ]);

  // Collect temp ingredient IDs that are still pending
  const pendingTempIds = new Set(
    requestsResult.items
      .filter((r) => r.status === "PENDING" && r.tempIngredientId)
      .map((r) => r.tempIngredientId!)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ingredients</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result.total} ingredient{result.total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ImportPlatformIngredientPanel storeId={storeId} />
          <RequestIngredientPanel />
        </div>
      </div>

      <IngredientTable items={result.items} pendingTempIds={pendingTempIds} />

      {/* Ingredient Requests section */}
      {requestsResult.items.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">My Ingredient Requests</h2>
          <div className="space-y-2">
            {requestsResult.items.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-lg border border-gray-200 p-4"
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
                    {req.notes && (
                      <p className="text-xs text-gray-500 italic">&ldquo;{req.notes}&rdquo;</p>
                    )}
                    {req.status === "REJECTED" && req.reviewNotes && (
                      <p className="mt-1 text-xs text-red-600">
                        <span className="font-medium">Rejection reason:</span> {req.reviewNotes}
                      </p>
                    )}
                    {req.status === "PENDING" && req.tempIngredientId && (
                      <p className="mt-1 text-xs text-blue-600">
                        A temporary ingredient is available for use in recipes while this request is being reviewed.
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
        </div>
      )}
    </div>
  );
}

