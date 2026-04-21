import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { listTenantProductCategories } from "@/services/owner/owner-tenant-products.service";
import ProductCategoryManagerPage from "@/components/owner/products/ProductCategoryManagerPage";
import Link from "next/link";

export default async function OwnerProductCategoriesPage() {
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const categories = tenantId ? await listTenantProductCategories(tenantId) : [];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/owner/products"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Products
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Product Categories</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Organize your product catalog with categories. Assign categories to products to make
          them easier to browse and manage.
        </p>
      </div>

      <ProductCategoryManagerPage initialCategories={categories} />
    </div>
  );
}
