import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { listIngredientRequests } from "@/services/marketplace/ingredient-requests.service";
import {
  INGREDIENT_REQUEST_STATUS_LABELS,
  type IngredientRequestStatus,
} from "@/types/marketplace";
import IngredientRequestReviewPanel from "@/components/admin/IngredientRequestReviewPanel";

export default async function AdminIngredientRequestsPage({
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
  const status = (statusParam ?? "PENDING") as IngredientRequestStatus;

  const result = await listIngredientRequests({ status, pageSize: 100 });

  const statusTabs: IngredientRequestStatus[] = [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "DUPLICATE",
  ];

  const statusColors: Record<IngredientRequestStatus, string> = {
    PENDING: "bg-blue-100 text-blue-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    DUPLICATE: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Ingredient Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Review owner-submitted ingredient requests and add them to the platform catalogue.
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6">
        {statusTabs.map((s) => (
          <a
            key={s}
            href={`/admin/ingredient-requests?status=${s}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              status === s
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {INGREDIENT_REQUEST_STATUS_LABELS[s]}
          </a>
        ))}
      </div>

      {result.items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">
            No {INGREDIENT_REQUEST_STATUS_LABELS[status].toLowerCase()} requests.
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
                    {req.category && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {req.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{req.unit}</span>
                  </div>
                  {req.description && (
                    <p className="text-xs text-gray-500 mb-1">
                      {req.description}
                    </p>
                  )}
                  {req.notes && (
                    <p className="text-xs text-gray-500 italic">
                      &ldquo;{req.notes}&rdquo;
                    </p>
                  )}
                  {req.tempIngredientId && (
                    <p className="text-xs text-blue-500 mt-0.5">
                      Temp ingredient created — recipe references will be migrated on approval.
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

                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    statusColors[req.status]
                  }`}
                >
                  {INGREDIENT_REQUEST_STATUS_LABELS[req.status]}
                </span>
              </div>

              {req.status === "PENDING" && (
                <IngredientRequestReviewPanel
                  requestId={req.id}
                  requestName={req.name}
                  requestDescription={req.description}
                  requestCategory={req.category}
                  requestUnit={req.unit}
                  requestNotes={req.notes}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">Total: {result.total}</div>
    </div>
  );
}

