/**
 * Owner Catalog Service — owner-level catalog management.
 *
 * Phase 1 — Beyond internal catalog ownership:
 * - Beyond internal catalog is the canonical operational model.
 * - All catalog entities (regardless of origin) are fully editable in Beyond.
 * - provenance (originType) is exposed as auxiliary metadata only.
 * - Audit trail is maintained for all changes.
 */
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import type {
  OwnerCategoryRow,
  OwnerProductRow,
  OwnerModifierGroupRow,
} from "@/types/owner";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listOwnerCategories(storeId: string): Promise<OwnerCategoryRow[]> {
  const categories = await prisma.catalogCategory.findMany({
    where: { storeId, deletedAt: null },
    include: {
      _count: { select: { productCategories: true } },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    originType: c.originType,
    // @deprecated: use originType instead
    sourceType: c.sourceType,
    displayOrder: c.displayOrder,
    isActive: c.isActive,
    isVisibleOnOnlineOrder: c.isVisibleOnOnlineOrder,
    isVisibleOnSubscription: c.isVisibleOnSubscription,
    imageUrl: c.imageUrl,
    onlineImageUrl: c.onlineImageUrl,
    subscriptionImageUrl: c.subscriptionImageUrl,
    localUiColor: c.localUiColor,
    productCount: c._count.productCategories,
  }));
}

export async function listOwnerProducts(
  storeId: string,
  filters?: {
    categoryId?: string;
    onlyVisible?: boolean;
    onlyFeatured?: boolean;
    onlySoldOut?: boolean;
    search?: string;
  }
): Promise<OwnerProductRow[]> {
  const products = await prisma.catalogProduct.findMany({
    where: {
      storeId,
      deletedAt: null,
      isActive: true,
      ...(filters?.onlyVisible ? { isVisibleOnOnlineOrder: true } : {}),
      ...(filters?.onlyFeatured ? { isFeatured: true } : {}),
      ...(filters?.onlySoldOut ? { isSoldOut: true } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { onlineName: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filters?.categoryId
        ? { productCategories: { some: { categoryId: filters.categoryId } } }
        : {}),
    },
    include: {
      productCategories: {
        include: { category: { select: { name: true } } },
      },
      _count: { select: { recipes: { where: { deletedAt: null } } } },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    originType: p.originType,
    // @deprecated: use originType instead
    sourceType: p.sourceType,
    onlineName: p.onlineName,
    subscriptionName: p.subscriptionName,
    shortDescription: p.shortDescription,
    basePriceAmount: p.basePriceAmount,
    currency: p.currency,
    imageUrl: p.imageUrl,
    displayOrder: p.displayOrder,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    isSoldOut: p.isSoldOut,
    isVisibleOnOnlineOrder: p.isVisibleOnOnlineOrder,
    isVisibleOnSubscription: p.isVisibleOnSubscription,
    internalNote: p.internalNote,
    categories: p.productCategories.map((pc) => pc.category.name),
    recipeCount: p._count.recipes,
  }));
}

export async function getOwnerProduct(
  storeId: string,
  productId: string
): Promise<OwnerProductRow | null> {
  const p = await prisma.catalogProduct.findFirst({
    where: { id: productId, storeId, deletedAt: null },
    include: {
      productCategories: {
        include: { category: { select: { name: true } } },
      },
      _count: { select: { recipes: { where: { deletedAt: null } } } },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    originType: p.originType,
    // @deprecated: use originType instead
    sourceType: p.sourceType,
    onlineName: p.onlineName,
    subscriptionName: p.subscriptionName,
    shortDescription: p.shortDescription,
    basePriceAmount: p.basePriceAmount,
    currency: p.currency,
    imageUrl: p.imageUrl,
    displayOrder: p.displayOrder,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    isSoldOut: p.isSoldOut,
    isVisibleOnOnlineOrder: p.isVisibleOnOnlineOrder,
    isVisibleOnSubscription: p.isVisibleOnSubscription,
    internalNote: p.internalNote,
    categories: p.productCategories.map((pc) => pc.category.name),
    recipeCount: p._count.recipes,
  };
}

export async function listOwnerModifierGroups(storeId: string): Promise<OwnerModifierGroupRow[]> {
  const groups = await prisma.catalogModifierGroup.findMany({
    where: { storeId, deletedAt: null },
    include: {
      modifierOptions: {
        where: { deletedAt: null },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    originType: g.originType,
    // @deprecated: use originType instead
    sourceType: g.sourceType,
    displayOrder: g.displayOrder,
    isActive: g.isActive,
    isVisibleOnOnlineOrder: g.isVisibleOnOnlineOrder,
    options: g.modifierOptions.map((o) => ({
      id: o.id,
      name: o.name,
      originType: o.originType,
      // @deprecated: use originType instead
      sourceType: o.sourceType,
      priceDeltaAmount: o.priceDeltaAmount,
      displayOrder: o.displayOrder,
      isDefault: o.isDefault,
      isSoldOut: o.isSoldOut,
      isActive: o.isActive,
    })),
  }));
}

// ─── Update (owner-local fields only) ─────────────────────────────────────────

export interface UpdateOwnerCategoryInput {
  categoryId: string;
  storeId: string;
  tenantId: string;
  actorUserId: string;
  data: {
    // Phase 1: name and description are now editable in Beyond regardless of origin.
    name?: string;
    description?: string | null;
    displayOrder?: number;
    isVisibleOnOnlineOrder?: boolean;
    isVisibleOnSubscription?: boolean;
    imageUrl?: string | null;
    onlineImageUrl?: string | null;
    subscriptionImageUrl?: string | null;
    localUiColor?: string | null;
  };
}

export async function updateOwnerCategory(input: UpdateOwnerCategoryInput): Promise<void> {
  const { categoryId, storeId, tenantId, actorUserId, data } = input;

  // Verify belongs to store
  await prisma.catalogCategory.findFirstOrThrow({
    where: { id: categoryId, storeId },
  });

  // Phase 1: Beyond owns the catalog. All fields are editable regardless of origin.
  await prisma.catalogCategory.update({
    where: { id: categoryId },
    data: {
      name: data.name,
      description: data.description,
      displayOrder: data.displayOrder,
      isVisibleOnOnlineOrder: data.isVisibleOnOnlineOrder,
      isVisibleOnSubscription: data.isVisibleOnSubscription,
      imageUrl: data.imageUrl,
      onlineImageUrl: data.onlineImageUrl,
      subscriptionImageUrl: data.subscriptionImageUrl,
      localUiColor: data.localUiColor,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "OWNER_CATEGORY_UPDATED",
    targetType: "CatalogCategory",
    targetId: categoryId,
    metadata: { fields: Object.keys(data) },
  });
}

export interface UpdateOwnerProductInput {
  productId: string;
  storeId: string;
  tenantId: string;
  actorUserId: string;
  data: {
    // Phase 1: core fields (name, price, description) are now editable in Beyond regardless of origin.
    name?: string;
    description?: string | null;
    basePriceAmount?: number;
    onlineName?: string | null;
    subscriptionName?: string | null;
    shortDescription?: string | null;
    imageUrl?: string | null;
    isFeatured?: boolean;
    isVisibleOnOnlineOrder?: boolean;
    isVisibleOnSubscription?: boolean;
    displayOrder?: number;
    internalNote?: string | null;
  };
}

export async function updateOwnerProduct(input: UpdateOwnerProductInput): Promise<void> {
  const { productId, storeId, tenantId, actorUserId, data } = input;

  // Verify belongs to store
  await prisma.catalogProduct.findFirstOrThrow({
    where: { id: productId, storeId },
  });

  // Phase 1: Beyond owns the catalog. All fields are editable regardless of origin.
  await prisma.catalogProduct.update({
    where: { id: productId },
    data: {
      name: data.name,
      description: data.description,
      basePriceAmount: data.basePriceAmount,
      onlineName: data.onlineName,
      subscriptionName: data.subscriptionName,
      shortDescription: data.shortDescription,
      imageUrl: data.imageUrl,
      isFeatured: data.isFeatured,
      isVisibleOnOnlineOrder: data.isVisibleOnOnlineOrder,
      isVisibleOnSubscription: data.isVisibleOnSubscription,
      displayOrder: data.displayOrder,
      internalNote: data.internalNote,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "OWNER_PRODUCT_UPDATED",
    targetType: "CatalogProduct",
    targetId: productId,
    metadata: { fields: Object.keys(data) },
  });
}

export interface UpdateOwnerModifierOptionInput {
  optionId: string;
  storeId: string;
  tenantId: string;
  actorUserId: string;
  data: {
    // Phase 1: core fields are now editable in Beyond regardless of origin.
    name?: string;
    priceDeltaAmount?: number;
    isSoldOut?: boolean;
    isDefault?: boolean;
    displayOrder?: number;
  };
}

export async function updateOwnerModifierOption(
  input: UpdateOwnerModifierOptionInput
): Promise<void> {
  const { optionId, storeId, tenantId, actorUserId, data } = input;

  await prisma.catalogModifierOption.findFirstOrThrow({
    where: { id: optionId, storeId },
  });

  // Phase 1: Beyond owns the catalog. All fields are editable regardless of origin.
  await prisma.catalogModifierOption.update({
    where: { id: optionId },
    data: {
      name: data.name,
      priceDeltaAmount: data.priceDeltaAmount,
      isSoldOut: data.isSoldOut,
      isDefault: data.isDefault,
      displayOrder: data.displayOrder,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "OWNER_MODIFIER_OPTION_UPDATED",
    targetType: "CatalogModifierOption",
    targetId: optionId,
    metadata: { fields: Object.keys(data) },
  });
}

export interface UpdateOwnerModifierGroupInput {
  groupId: string;
  storeId: string;
  tenantId: string;
  actorUserId: string;
  data: {
    // Phase 1: name is now editable in Beyond regardless of origin.
    name?: string;
    isVisibleOnOnlineOrder?: boolean;
    displayOrder?: number;
  };
}

export async function updateOwnerModifierGroup(
  input: UpdateOwnerModifierGroupInput
): Promise<void> {
  const { groupId, storeId, tenantId, actorUserId, data } = input;

  await prisma.catalogModifierGroup.findFirstOrThrow({
    where: { id: groupId, storeId },
  });

  await prisma.catalogModifierGroup.update({
    where: { id: groupId },
    data: {
      name: data.name,
      isVisibleOnOnlineOrder: data.isVisibleOnOnlineOrder,
      displayOrder: data.displayOrder,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "OWNER_MODIFIER_GROUP_UPDATED",
    targetType: "CatalogModifierGroup",
    targetId: groupId,
    metadata: { fields: Object.keys(data) },
  });
}
