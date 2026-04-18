/**
 * Catalog service — internal catalog read/write helpers.
 *
 * Phase 1 — Beyond internal catalog ownership:
 * - Beyond internal catalog is the ONLY canonical operational model.
 * - All reads use the internal catalog_* tables. External mirror tables are
 *   never read by customer-facing or backoffice paths.
 * - All catalog entities (regardless of origin) are fully editable in Beyond.
 * - provenance (originType, originConnectionId, originExternalRef) records
 *   where an entity ORIGINALLY came from — it does NOT lock editing rights.
 * - Money is always in integer minor units (never float).
 */

import { prisma } from "@/lib/prisma";
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogModifierGroup,
  CatalogModifierOption,
  CatalogProductCategory,
  CatalogProductModifierGroup,
} from "@prisma/client";

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listCatalogCategories(
  storeId: string,
  opts?: { activeOnly?: boolean; visibleOnOnlineOrder?: boolean }
): Promise<CatalogCategory[]> {
  return prisma.catalogCategory.findMany({
    where: {
      storeId,
      deletedAt: null,
      ...(opts?.activeOnly ? { isActive: true } : {}),
      ...(opts?.visibleOnOnlineOrder !== undefined
        ? { isVisibleOnOnlineOrder: opts.visibleOnOnlineOrder }
        : {}),
    },
    orderBy: { displayOrder: "asc" },
  });
}

export interface UpdateCategoryMerchandisingInput {
  displayOrder?: number;
  isVisibleOnOnlineOrder?: boolean;
  isVisibleOnSubscription?: boolean;
  imageUrl?: string;
}

export async function updateCategoryMerchandising(
  categoryId: string,
  input: UpdateCategoryMerchandisingInput
): Promise<CatalogCategory> {
  return prisma.catalogCategory.update({
    where: { id: categoryId },
    data: {
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      ...(input.isVisibleOnOnlineOrder !== undefined
        ? { isVisibleOnOnlineOrder: input.isVisibleOnOnlineOrder }
        : {}),
      ...(input.isVisibleOnSubscription !== undefined
        ? { isVisibleOnSubscription: input.isVisibleOnSubscription }
        : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
    },
  });
}

export async function reorderCategories(
  storeId: string,
  orderedIds: string[]
): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.catalogCategory.update({
        where: { id, storeId },
        data: { displayOrder: index },
      })
    )
  );
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function listCatalogProducts(
  storeId: string,
  opts?: { categoryId?: string; activeOnly?: boolean }
): Promise<CatalogProduct[]> {
  if (opts?.categoryId) {
    const links = await prisma.catalogProductCategory.findMany({
      where: { storeId, categoryId: opts.categoryId },
      orderBy: { sortOrder: "asc" },
      include: { product: true },
    });
    return links
      .map((l) => l.product)
      .filter((p) => !p.deletedAt && (!opts.activeOnly || p.isActive));
  }

  return prisma.catalogProduct.findMany({
    where: {
      storeId,
      deletedAt: null,
      ...(opts?.activeOnly ? { isActive: true } : {}),
    },
    orderBy: { displayOrder: "asc" },
  });
}

export interface UpdateProductMerchandisingInput {
  displayOrder?: number;
  isVisibleOnOnlineOrder?: boolean;
  isVisibleOnSubscription?: boolean;
  isFeatured?: boolean;
  onlineName?: string;
  subscriptionName?: string;
  internalNote?: string;
  imageUrl?: string;
}

export async function updateProductMerchandising(
  productId: string,
  input: UpdateProductMerchandisingInput
): Promise<CatalogProduct> {
  return prisma.catalogProduct.update({
    where: { id: productId },
    data: {
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      ...(input.isVisibleOnOnlineOrder !== undefined
        ? { isVisibleOnOnlineOrder: input.isVisibleOnOnlineOrder }
        : {}),
      ...(input.isVisibleOnSubscription !== undefined
        ? { isVisibleOnSubscription: input.isVisibleOnSubscription }
        : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...(input.onlineName !== undefined ? { onlineName: input.onlineName } : {}),
      ...(input.subscriptionName !== undefined
        ? { subscriptionName: input.subscriptionName }
        : {}),
      ...(input.internalNote !== undefined ? { internalNote: input.internalNote } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
    },
  });
}

export async function setProductSoldOut(
  productId: string,
  isSoldOut: boolean
): Promise<CatalogProduct> {
  return prisma.catalogProduct.update({
    where: { id: productId },
    data: { isSoldOut },
  });
}

// ─── Products grouped by category (for inventory/availability view) ───────────

export interface ProductWithCategory extends CatalogProduct {
  primaryCategoryId: string | null;
  primaryCategoryName: string | null;
}

export async function listProductsGroupedByCategory(
  storeId: string
): Promise<{ categoryId: string; categoryName: string; products: CatalogProduct[] }[]> {
  const categories = await prisma.catalogCategory.findMany({
    where: { storeId, deletedAt: null, isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  const productCategories = await prisma.catalogProductCategory.findMany({
    where: { storeId },
    orderBy: { sortOrder: "asc" },
    include: {
      product: true,
    },
  });

  const grouped = new Map<string, CatalogProduct[]>();
  for (const cat of categories) {
    grouped.set(cat.id, []);
  }

  for (const link of productCategories) {
    const prod = link.product;
    if (prod.deletedAt || !prod.isActive) continue;
    const list = grouped.get(link.categoryId);
    if (list) list.push(prod);
  }

  return categories
    .map((cat) => ({
      categoryId: cat.id,
      categoryName: cat.name,
      products: grouped.get(cat.id) ?? [],
    }))
    .filter((group) => group.products.length > 0);
}

// ─── Modifier Groups & Options ────────────────────────────────────────────────

export async function listModifierGroups(
  storeId: string,
  opts?: { activeOnly?: boolean }
): Promise<(CatalogModifierGroup & { modifierOptions: CatalogModifierOption[] })[]> {
  return prisma.catalogModifierGroup.findMany({
    where: {
      storeId,
      deletedAt: null,
      ...(opts?.activeOnly ? { isActive: true } : {}),
    },
    orderBy: { displayOrder: "asc" },
    include: {
      modifierOptions: {
        where: { deletedAt: null },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
}

export async function setModifierOptionSoldOut(
  optionId: string,
  isSoldOut: boolean
): Promise<CatalogModifierOption> {
  return prisma.catalogModifierOption.update({
    where: { id: optionId },
    data: { isSoldOut },
  });
}

// ─── Product modifier group links (for order UI) ──────────────────────────────

export async function listProductModifierGroups(
  productId: string
): Promise<
  (CatalogProductModifierGroup & {
    modifierGroup: CatalogModifierGroup & { modifierOptions: CatalogModifierOption[] };
  })[]
> {
  return prisma.catalogProductModifierGroup.findMany({
    where: { productId, isActive: true },
    orderBy: { displayOrder: "asc" },
    include: {
      modifierGroup: {
        include: {
          modifierOptions: {
            where: { isActive: true, deletedAt: null },
            orderBy: { displayOrder: "asc" },
          },
        },
      },
    },
  });
}

// ─── Channel mapping lookup (for outbound orders) ────────────────────────────

export async function resolveExternalId(
  connectionId: string,
  entityType: "CATEGORY" | "PRODUCT" | "MODIFIER_GROUP" | "MODIFIER_OPTION",
  internalEntityId: string
): Promise<string | null> {
  // Phase 3: query by internalEntityType + internalEntityId (no longer a unique index).
  const mapping = await prisma.channelEntityMapping.findFirst({
    where: {
      connectionId,
      internalEntityType: entityType,
      internalEntityId,
      status: "ACTIVE",
    },
  });
  if (!mapping) return null;
  return mapping.externalEntityId;
}
