import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { prisma } from "@/lib/prisma";
import AdminRecipeActions from "@/components/admin/AdminRecipeActions";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ storeId?: string; page?: string }>;
}

export default async function AdminRecipesPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();

  const params = await searchParams;
  const selectedTenantId = params.storeId ?? "";
  const page = params.page ? Number(params.page) : 1;
  const pageSize = 20;

  // Fetch all tenants for the filter selector
  const tenants = await prisma.tenant.findMany({
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
  });

  // Fetch recipes (optionally filtered by tenant)
  let recipes: {
    id: string;
    name: string;
    tenantId: string | null;
    tenantName: string | null;
    categoryId: string | null;
    categoryName: string | null;
    yieldQty: number;
    yieldUnit: string;
    notes: string | null;
    createdAt: string;
  }[] = [];
  let total = 0;

  const where = {
    deletedAt: null,
    ...(selectedTenantId ? { tenantId: selectedTenantId } : {}),
  };

  const [rows, count] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.recipe.count({ where }),
  ]);

  // Fetch tenant names only for recipes that have a tenantId
  const recipeTenantIds = [...new Set(rows.map((r) => r.tenantId).filter((id): id is string => id !== null))];
  const tenantRows = await prisma.tenant.findMany({
    where: { id: { in: recipeTenantIds } },
    select: { id: true, displayName: true },
  });
  const tenantNameMap = new Map(tenantRows.map((t) => [t.id, t.displayName]));

  recipes = rows.map((r) => ({
    id: r.id,
    name: r.name,
    tenantId: r.tenantId,
    tenantName: r.tenantId ? (tenantNameMap.get(r.tenantId) ?? null) : null,
    categoryId: r.categoryId,
    categoryName: r.category?.name ?? null,
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
            {total} {total === 1 ? "recipe" : "recipes"} total
          </p>
        </div>
        <Link
          href="/admin/recipes/new"
          className="px-4 py-2 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-800 transition"
        >
          + Add Recipe
        </Link>
      </div>

      {/* Tenant filter */}
      <form method="GET" className="flex items-center gap-3">
        <label className="text-xs text-gray-500 font-medium">Tenant filter:</label>
        <select
          name="storeId"
          defaultValue={selectedTenantId}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">All tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.displayName}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-3 py-1.5 text-xs font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 transition"
        >
          Apply Filter
        </button>
        {selectedTenantId && (
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
              <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Category</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Tenant</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Yield</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {recipes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
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
              href={`?storeId=${selectedTenantId}&page=${page - 1}`}
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
              href={`?storeId=${selectedTenantId}&page=${page + 1}`}
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
