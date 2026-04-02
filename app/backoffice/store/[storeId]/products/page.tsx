import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listCatalogProducts } from "@/services/catalog.service";
import CatalogProductsClient from "./CatalogProductsClient";

export default async function BackofficeProductsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.MENU_MANAGE);

  const products = await listCatalogProducts(storeId);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Product Management</h1>
      <CatalogProductsClient initialProducts={products} />
    </div>
  );
}
