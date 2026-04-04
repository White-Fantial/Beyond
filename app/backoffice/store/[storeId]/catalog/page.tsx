import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";
import BackofficeCatalogClient from "./BackofficeCatalogClient";

export default async function CatalogPage({ params }: { params: { storeId: string } }) {
  const { storeId } = params;
  await requireStorePermission(storeId, PERMISSIONS.INVENTORY);

  const categories = await prisma.catalogCategory.findMany({
    where: { storeId, deletedAt: null },
    include: {
      products: { where: { deletedAt: null }, orderBy: { displayOrder: "asc" } },
    },
    orderBy: { displayOrder: "asc" },
  });

  const modifierGroups = await prisma.catalogModifierGroup.findMany({
    where: { storeId, deletedAt: null },
    include: {
      options: { where: { deletedAt: null }, orderBy: { displayOrder: "asc" } },
    },
    orderBy: { displayOrder: "asc" },
  });

  return (
    <BackofficeCatalogClient
      storeId={storeId}
      initialCategories={categories}
      initialModifierGroups={modifierGroups}
    />
  );
}
