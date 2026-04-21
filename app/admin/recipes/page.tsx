import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { prisma } from "@/lib/prisma";
import AdminCreateRecipeForm from "@/components/admin/AdminCreateRecipeForm";
import AdminRecipeActions from "@/components/admin/AdminRecipeActions";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ storeId?: string; page?: string }>;
}

export default async function AdminRecipesPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();

  const params = await searchParams;
  const selectedStoreId = params.storeId ?? "";
  const page = params.page ? Number(params.page) : 1;
  const pageSize = 20;

  // Fetch all active stores for the selector
  const stores = await prisma.store.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, tenantId: true, tenant: { select: { displayName: true } } },
    orderBy: { name: "asc" },
  });

  // Fetch recipes (optionally filtered by store)
  let recipes: {
    id: string;
    name: string;
    storeId: string;
    storeName: string | null;
    yieldQty: number;
    yieldUnit: string;
    notes: string | null;
    createdAt: string;
  }[] = [];
  let total = 0;

  const where = {
    deletedAt: null,
    ...(selectedStoreId ? { storeId: selectedStoreId } : {}),
  };

  const [rows, count] = await Promise.all([
    prisma.recipe.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.recipe.count({ where }),
  ]);

  // Fetch store names for the returned recipes
  const recipeStoreIds = [...new Set(rows.map((r) => r.storeId))];
  const storeRows = await prisma.store.findMany({
    where: { id: { in: recipeStoreIds } },
    select: { id: true, name: true },
  });
  const storeNameMap = new Map(storeRows.map((s) => [s.id, s.name]));

  recipes = rows.map((r) => ({
    id: r.id,
    name: r.name,
    storeId: r.storeId,
    storeName: storeNameMap.get(r.storeId) ?? null,
    yieldQty: r.yieldQty,
    yieldUnit: r.yieldUnit,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  }));
  total = count;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Recipe Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} recipe{total !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      {/* Create recipe form */}
      <AdminCreateRecipeForm stores={stores} />

      {/* Store filter */}
      <form method="GET" className="flex items-center gap-3">
        <label className="text-xs text-gray-500 font-medium">Store filter:</label>
        <select
          name="storeId"
          defaultValue={selectedStoreId}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">All stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.tenant?.displayName ?? s.tenantId})
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-3 py-1.5 text-xs font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 transition"
        >
          Apply filter
        </button>
        {selectedStoreId && (
          <Link
            href="/admin/recipes"
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Recipe list */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Recipe Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Store</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Yield</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {recipes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No recipes found.
                </td>
              </tr>
            ) : (
              recipes.map((r) => (
                <AdminRecipeActions key={r.id} recipe={r} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center gap-2 text-sm">
          {page > 1 && (
            <a
              href={`?storeId=${selectedStoreId}&page=${page - 1}`}
              className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Previous
            </a>
          )}
          <span className="text-gray-500">
            Page {page} of {Math.ceil(total / pageSize)}
          </span>
          {page < Math.ceil(total / pageSize) && (
            <a
              href={`?storeId=${selectedStoreId}&page=${page + 1}`}
              className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
