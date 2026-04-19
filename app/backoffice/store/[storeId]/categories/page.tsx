import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listCatalogCategories } from "@/services/catalog.service";
import CatalogCategoriesClient from "./CatalogCategoriesClient";

export default async function BackofficeCategoriesPage({
  params,
}: {
  params: { storeId: string };
}) {
  const { storeId } = params;
  await requireStorePermission(storeId, PERMISSIONS.CATEGORY_MANAGE);

  const categories = await listCatalogCategories(storeId);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Category Management</h1>
      <CatalogCategoriesClient storeId={storeId} initialCategories={categories} />
    </div>
  );
}
