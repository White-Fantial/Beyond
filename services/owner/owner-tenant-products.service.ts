/**
 * Owner Tenant Products Service — manages tenant-level shared product definitions.
 *
 * TenantCatalogProduct is a product template owned at the tenant level (no storeId).
 * Individual stores select which tenant products they want to sell via StoreProductSelection,
 * optionally overriding the base price per store.
 */
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import type { TenantProductRow, TenantProductCategoryRow, StoreProductSelectionRow } from "@/types/owner";

// ─── Tenant-level product categories ──────────────────────────────────────────

export async function listTenantProductCategories(
  tenantId: string
): Promise<TenantProductCategoryRow[]> {
  const rows = await prisma.tenantProductCategory.findMany({
    where: { tenantId },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    name: r.name,
    displayOrder: r.displayOrder,
  }));
}

export async function createTenantProductCategory(
  tenantId: string,
  actorUserId: string,
  name: string,
  displayOrder = 0
): Promise<TenantProductCategoryRow> {
  const row = await prisma.tenantProductCategory.create({
    data: { tenantId, name: name.trim(), displayOrder },
  });
  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_PRODUCT_CATEGORY_CREATED",
    targetType: "TenantProductCategory",
    targetId: row.id,
    metadata: { name },
  });
  return { id: row.id, tenantId: row.tenantId, name: row.name, displayOrder: row.displayOrder };
}

export async function updateTenantProductCategory(
  tenantId: string,
  categoryId: string,
  actorUserId: string,
  data: { name?: string; displayOrder?: number }
): Promise<TenantProductCategoryRow> {
  const existing = await prisma.tenantProductCategory.findFirst({
    where: { id: categoryId, tenantId },
  });
  if (!existing) throw new Error("Category not found");

  const row = await prisma.tenantProductCategory.update({
    where: { id: categoryId },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
    },
  });
  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_PRODUCT_CATEGORY_UPDATED",
    targetType: "TenantProductCategory",
    targetId: categoryId,
    metadata: { fields: Object.keys(data) },
  });
  return { id: row.id, tenantId: row.tenantId, name: row.name, displayOrder: row.displayOrder };
}

export async function deleteTenantProductCategory(
  tenantId: string,
  categoryId: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.tenantProductCategory.findFirst({
    where: { id: categoryId, tenantId },
  });
  if (!existing) throw new Error("Category not found");

  await prisma.tenantProductCategory.delete({ where: { id: categoryId } });
  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_PRODUCT_CATEGORY_DELETED",
    targetType: "TenantProductCategory",
    targetId: categoryId,
    metadata: {},
  });
}

// ─── Tenant-level product CRUD ────────────────────────────────────────────────

export async function listTenantProducts(tenantId: string): Promise<TenantProductRow[]> {
  const products = await prisma.tenantCatalogProduct.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      _count: { select: { storeSelections: true } },
      category: true,
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return products.map((p) => ({
    id: p.id,
    tenantId: p.tenantId,
    name: p.name,
    description: p.description,
    shortDescription: p.shortDescription,
    basePriceAmount: p.basePriceAmount,
    currency: p.currency,
    imageUrl: p.imageUrl,
    displayOrder: p.displayOrder,
    isActive: p.isActive,
    internalNote: p.internalNote,
    createdAt: p.createdAt.toISOString(),
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    selectionCount: p._count.storeSelections,
  }));
}

export async function getTenantProduct(
  tenantId: string,
  productId: string
): Promise<TenantProductRow | null> {
  const p = await prisma.tenantCatalogProduct.findFirst({
    where: { id: productId, tenantId, deletedAt: null },
    include: {
      _count: { select: { storeSelections: true } },
      category: true,
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    tenantId: p.tenantId,
    name: p.name,
    description: p.description,
    shortDescription: p.shortDescription,
    basePriceAmount: p.basePriceAmount,
    currency: p.currency,
    imageUrl: p.imageUrl,
    displayOrder: p.displayOrder,
    isActive: p.isActive,
    internalNote: p.internalNote,
    createdAt: p.createdAt.toISOString(),
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    selectionCount: p._count.storeSelections,
  };
}

export interface CreateTenantProductInput {
  tenantId: string;
  actorUserId: string;
  data: {
    name: string;
    description?: string | null;
    shortDescription?: string | null;
    basePriceAmount?: number;
    currency?: string;
    imageUrl?: string | null;
    displayOrder?: number;
    isActive?: boolean;
    internalNote?: string | null;
    categoryId?: string | null;
  };
}

export async function createTenantProduct(input: CreateTenantProductInput): Promise<TenantProductRow> {
  const { tenantId, actorUserId, data } = input;

  const product = await prisma.tenantCatalogProduct.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description ?? null,
      shortDescription: data.shortDescription ?? null,
      basePriceAmount: data.basePriceAmount ?? 0,
      currency: data.currency ?? "USD",
      imageUrl: data.imageUrl ?? null,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
      internalNote: data.internalNote ?? null,
      categoryId: data.categoryId ?? null,
    },
    include: {
      _count: { select: { storeSelections: true } },
      category: true,
    },
  });

  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_PRODUCT_CREATED",
    targetType: "TenantCatalogProduct",
    targetId: product.id,
    metadata: { name: data.name },
  });

  return {
    id: product.id,
    tenantId: product.tenantId,
    name: product.name,
    description: product.description,
    shortDescription: product.shortDescription,
    basePriceAmount: product.basePriceAmount,
    currency: product.currency,
    imageUrl: product.imageUrl,
    displayOrder: product.displayOrder,
    isActive: product.isActive,
    internalNote: product.internalNote,
    createdAt: product.createdAt.toISOString(),
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    selectionCount: product._count.storeSelections,
  };
}

export interface UpdateTenantProductInput {
  tenantId: string;
  productId: string;
  actorUserId: string;
  data: {
    name?: string;
    description?: string | null;
    shortDescription?: string | null;
    basePriceAmount?: number;
    imageUrl?: string | null;
    displayOrder?: number;
    isActive?: boolean;
    internalNote?: string | null;
    categoryId?: string | null;
  };
}

export async function updateTenantProduct(input: UpdateTenantProductInput): Promise<void> {
  const { tenantId, productId, actorUserId, data } = input;

  await prisma.tenantCatalogProduct.findFirstOrThrow({
    where: { id: productId, tenantId, deletedAt: null },
  });

  await prisma.tenantCatalogProduct.update({
    where: { id: productId },
    data: {
      name: data.name,
      description: data.description,
      shortDescription: data.shortDescription,
      basePriceAmount: data.basePriceAmount,
      imageUrl: data.imageUrl,
      displayOrder: data.displayOrder,
      isActive: data.isActive,
      internalNote: data.internalNote,
      categoryId: data.categoryId,
    },
  });

  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_PRODUCT_UPDATED",
    targetType: "TenantCatalogProduct",
    targetId: productId,
    metadata: { fields: Object.keys(data) },
  });
}

export async function deleteTenantProduct(
  tenantId: string,
  productId: string,
  actorUserId: string
): Promise<void> {
  await prisma.tenantCatalogProduct.findFirstOrThrow({
    where: { id: productId, tenantId, deletedAt: null },
  });

  await prisma.tenantCatalogProduct.update({
    where: { id: productId },
    data: { deletedAt: new Date() },
  });

  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_PRODUCT_DELETED",
    targetType: "TenantCatalogProduct",
    targetId: productId,
    metadata: {},
  });
}

// ─── Store product selections ──────────────────────────────────────────────────

export async function listStoreProductSelections(
  storeId: string
): Promise<StoreProductSelectionRow[]> {
  const selections = await prisma.storeProductSelection.findMany({
    where: { storeId },
    include: { tenantProduct: true },
    orderBy: [{ displayOrder: "asc" }, { selectedAt: "asc" }],
  });

  return selections.map((s) => ({
    id: s.id,
    storeId: s.storeId,
    tenantProductId: s.tenantProductId,
    effectivePriceAmount: s.customPriceAmount ?? s.tenantProduct.basePriceAmount,
    customPriceAmount: s.customPriceAmount,
    isActive: s.isActive,
    displayOrder: s.displayOrder,
    selectedAt: s.selectedAt.toISOString(),
    product: {
      name: s.tenantProduct.name,
      description: s.tenantProduct.description,
      shortDescription: s.tenantProduct.shortDescription,
      basePriceAmount: s.tenantProduct.basePriceAmount,
      currency: s.tenantProduct.currency,
      imageUrl: s.tenantProduct.imageUrl,
    },
  }));
}

export interface SelectProductForStoreInput {
  tenantId: string;
  storeId: string;
  tenantProductId: string;
  actorUserId: string;
  customPriceAmount?: number | null;
  displayOrder?: number;
}

export async function selectProductForStore(
  input: SelectProductForStoreInput
): Promise<StoreProductSelectionRow> {
  const { tenantId, storeId, tenantProductId, actorUserId, customPriceAmount, displayOrder } = input;

  // Verify tenant product exists and belongs to same tenant
  const tenantProduct = await prisma.tenantCatalogProduct.findFirstOrThrow({
    where: { id: tenantProductId, tenantId, deletedAt: null },
  });

  const selection = await prisma.storeProductSelection.upsert({
    where: { storeId_tenantProductId: { storeId, tenantProductId } },
    create: {
      tenantId,
      storeId,
      tenantProductId,
      customPriceAmount: customPriceAmount ?? null,
      isActive: true,
      displayOrder: displayOrder ?? 0,
    },
    update: {
      isActive: true,
      customPriceAmount: customPriceAmount ?? null,
      displayOrder: displayOrder ?? 0,
    },
    include: { tenantProduct: true },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "STORE_PRODUCT_SELECTED",
    targetType: "StoreProductSelection",
    targetId: selection.id,
    metadata: { tenantProductId, productName: tenantProduct.name },
  });

  return {
    id: selection.id,
    storeId: selection.storeId,
    tenantProductId: selection.tenantProductId,
    effectivePriceAmount: selection.customPriceAmount ?? selection.tenantProduct.basePriceAmount,
    customPriceAmount: selection.customPriceAmount,
    isActive: selection.isActive,
    displayOrder: selection.displayOrder,
    selectedAt: selection.selectedAt.toISOString(),
    product: {
      name: selection.tenantProduct.name,
      description: selection.tenantProduct.description,
      shortDescription: selection.tenantProduct.shortDescription,
      basePriceAmount: selection.tenantProduct.basePriceAmount,
      currency: selection.tenantProduct.currency,
      imageUrl: selection.tenantProduct.imageUrl,
    },
  };
}

export async function deselectProductFromStore(
  tenantId: string,
  storeId: string,
  tenantProductId: string,
  actorUserId: string
): Promise<void> {
  const selection = await prisma.storeProductSelection.findUnique({
    where: { storeId_tenantProductId: { storeId, tenantProductId } },
  });
  if (!selection || selection.tenantId !== tenantId) {
    throw new Error("Product selection not found");
  }

  await prisma.storeProductSelection.delete({
    where: { storeId_tenantProductId: { storeId, tenantProductId } },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "STORE_PRODUCT_DESELECTED",
    targetType: "StoreProductSelection",
    targetId: selection.id,
    metadata: { tenantProductId },
  });
}
