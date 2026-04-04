import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";
import BackofficeCatalogClient from "./BackofficeCatalogClient";

export default async function CatalogPage({ params }: { params: { storeId: string } }) {
  const { storeId } = params;
  await requireStorePermission(storeId, PERMISSIONS.INVENTORY);

  const rawCategories = await prisma.catalogCategory.findMany({
    where: { storeId, deletedAt: null },
    include: {
      productCategories: {
        where: { product: { deletedAt: null } },
        orderBy: { sortOrder: "asc" },
        include: { product: true },
      },
    },
    orderBy: { displayOrder: "asc" },
  });

  const categories = rawCategories.map((c) => ({
    ...c,
    products: c.productCategories.map((pc) => pc.product),
  }));

  const rawModifierGroups = await prisma.catalogModifierGroup.findMany({
    where: { storeId, deletedAt: null },
    include: {
      modifierOptions: { where: { deletedAt: null }, orderBy: { displayOrder: "asc" } },
    },
    orderBy: { displayOrder: "asc" },
  });

  const modifierGroups = rawModifierGroups.map((g) => ({
    ...g,
    options: g.modifierOptions,
  }));

  return (
    <BackofficeCatalogClient
      storeId={storeId}
      initialCategories={categories}
      initialModifierGroups={modifierGroups}
    />
  );
}
