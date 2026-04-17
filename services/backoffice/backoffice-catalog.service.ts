/**
 * Backoffice Catalog Service — Phase 3, updated for Phase 1 internal ownership.
 *
 * Full CRUD for categories, products, modifier groups, and modifier options.
 * Phase 1 change: ALL catalog entities are editable in Beyond regardless of
 * their originType (BEYOND_CREATED, IMPORTED_FROM_POS, etc.).
 * Soft-delete is used for all deletes (deletedAt timestamp).
 */

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogModifierGroup,
  CatalogModifierOption,
} from "@prisma/client";

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateCategoryInput {
  name: string;
  description?: string;
  displayOrder?: number;
  isVisibleOnOnlineOrder?: boolean;
  isVisibleOnSubscription?: boolean;
  imageUrl?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  displayOrder?: number;
  isVisibleOnOnlineOrder?: boolean;
  isVisibleOnSubscription?: boolean;
  imageUrl?: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  basePriceAmount: number;
  currency?: string;
  displayOrder?: number;
  isVisibleOnOnlineOrder?: boolean;
  isVisibleOnSubscription?: boolean;
  isFeatured?: boolean;
  onlineName?: string;
  subscriptionName?: string;
  imageUrl?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  basePriceAmount?: number;
  displayOrder?: number;
  isVisibleOnOnlineOrder?: boolean;
  isVisibleOnSubscription?: boolean;
  isFeatured?: boolean;
  onlineName?: string;
  subscriptionName?: string;
  imageUrl?: string;
  isSoldOut?: boolean;
}

export interface CreateModifierGroupInput {
  name: string;
  description?: string;
  selectionMin?: number;
  selectionMax?: number;
  isRequired?: boolean;
  displayOrder?: number;
  isVisibleOnOnlineOrder?: boolean;
}

export interface UpdateModifierGroupInput {
  name?: string;
  description?: string;
  selectionMin?: number;
  selectionMax?: number;
  isRequired?: boolean;
  displayOrder?: number;
  isVisibleOnOnlineOrder?: boolean;
}

export interface CreateModifierOptionInput {
  name: string;
  description?: string;
  priceDeltaAmount?: number;
  currency?: string;
  displayOrder?: number;
  isDefault?: boolean;
}

export interface UpdateModifierOptionInput {
  name?: string;
  description?: string;
  priceDeltaAmount?: number;
  displayOrder?: number;
  isDefault?: boolean;
  isSoldOut?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getStoreTenantId(storeId: string): Promise<string> {
  const store = await prisma.store.findUniqueOrThrow({
    where: { id: storeId },
    select: { tenantId: true },
  });
  return store.tenantId;
}

// ─── Category CRUD ────────────────────────────────────────────────────────────

export async function createBackofficeCategory(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  input: CreateCategoryInput
): Promise<CatalogCategory> {
  const category = await prisma.catalogCategory.create({
    data: {
      tenantId,
      storeId,
      sourceType: "LOCAL",
      originType: "BEYOND_CREATED",
      name: input.name,
      description: input.description ?? null,
      displayOrder: input.displayOrder ?? 0,
      isVisibleOnOnlineOrder: input.isVisibleOnOnlineOrder ?? true,
      isVisibleOnSubscription: input.isVisibleOnSubscription ?? false,
      imageUrl: input.imageUrl ?? null,
      isActive: true,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_CATEGORY_CREATED",
    targetType: "CatalogCategory",
    targetId: category.id,
    metadata: { name: input.name },
  });

  return category;
}

export async function updateBackofficeCategory(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  categoryId: string,
  input: UpdateCategoryInput
): Promise<CatalogCategory> {
  const existing = await prisma.catalogCategory.findUniqueOrThrow({
    where: { id: categoryId },
    select: { storeId: true },
  });

  if (existing.storeId !== storeId) {
    throw new Error("Category does not belong to this store");
  }

  // Phase 1: Beyond owns the catalog. All fields are editable regardless of origin.
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.displayOrder !== undefined) data.displayOrder = input.displayOrder;
  if (input.isVisibleOnOnlineOrder !== undefined)
    data.isVisibleOnOnlineOrder = input.isVisibleOnOnlineOrder;
  if (input.isVisibleOnSubscription !== undefined)
    data.isVisibleOnSubscription = input.isVisibleOnSubscription;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;

  const category = await prisma.catalogCategory.update({
    where: { id: categoryId },
    data,
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_CATEGORY_UPDATED",
    targetType: "CatalogCategory",
    targetId: categoryId,
    metadata: { changes: input },
  });

  return category;
}

export async function deleteBackofficeCategory(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  categoryId: string
): Promise<void> {
  const existing = await prisma.catalogCategory.findUniqueOrThrow({
    where: { id: categoryId },
    select: { storeId: true },
  });

  if (existing.storeId !== storeId) {
    throw new Error("Category does not belong to this store");
  }

  // Phase 1: Beyond owns all catalog entities. Any category can be soft-deleted.

  await prisma.catalogCategory.update({
    where: { id: categoryId },
    data: { deletedAt: new Date() },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_CATEGORY_DELETED",
    targetType: "CatalogCategory",
    targetId: categoryId,
  });
}

// ─── Product CRUD ─────────────────────────────────────────────────────────────

export async function createBackofficeProduct(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  input: CreateProductInput
): Promise<CatalogProduct> {
  const product = await prisma.catalogProduct.create({
    data: {
      tenantId,
      storeId,
      sourceType: "LOCAL",
      originType: "BEYOND_CREATED",
      name: input.name,
      description: input.description ?? null,
      basePriceAmount: input.basePriceAmount,
      currency: input.currency ?? "NZD",
      displayOrder: input.displayOrder ?? 0,
      isVisibleOnOnlineOrder: input.isVisibleOnOnlineOrder ?? true,
      isVisibleOnSubscription: input.isVisibleOnSubscription ?? false,
      isFeatured: input.isFeatured ?? false,
      onlineName: input.onlineName ?? null,
      subscriptionName: input.subscriptionName ?? null,
      imageUrl: input.imageUrl ?? null,
      isActive: true,
      isSellable: true,
      isSoldOut: false,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_PRODUCT_CREATED",
    targetType: "CatalogProduct",
    targetId: product.id,
    metadata: { name: input.name, basePriceAmount: input.basePriceAmount },
  });

  return product;
}

export async function updateBackofficeProduct(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  productId: string,
  input: UpdateProductInput
): Promise<CatalogProduct> {
  const existing = await prisma.catalogProduct.findUniqueOrThrow({
    where: { id: productId },
    select: { storeId: true },
  });

  if (existing.storeId !== storeId) {
    throw new Error("Product does not belong to this store");
  }

  // Phase 1: Beyond owns the catalog. All fields are editable regardless of origin.
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.basePriceAmount !== undefined) data.basePriceAmount = input.basePriceAmount;
  if (input.displayOrder !== undefined) data.displayOrder = input.displayOrder;
  if (input.isVisibleOnOnlineOrder !== undefined)
    data.isVisibleOnOnlineOrder = input.isVisibleOnOnlineOrder;
  if (input.isVisibleOnSubscription !== undefined)
    data.isVisibleOnSubscription = input.isVisibleOnSubscription;
  if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
  if (input.onlineName !== undefined) data.onlineName = input.onlineName;
  if (input.subscriptionName !== undefined) data.subscriptionName = input.subscriptionName;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
  if (input.isSoldOut !== undefined) data.isSoldOut = input.isSoldOut;

  const product = await prisma.catalogProduct.update({
    where: { id: productId },
    data,
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_PRODUCT_UPDATED",
    targetType: "CatalogProduct",
    targetId: productId,
    metadata: { changes: input },
  });

  return product;
}

export async function deleteBackofficeProduct(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  productId: string
): Promise<void> {
  const existing = await prisma.catalogProduct.findUniqueOrThrow({
    where: { id: productId },
    select: { storeId: true },
  });

  if (existing.storeId !== storeId) {
    throw new Error("Product does not belong to this store");
  }

  // Phase 1: Beyond owns all catalog entities. Any product can be soft-deleted.

  await prisma.catalogProduct.update({
    where: { id: productId },
    data: { deletedAt: new Date() },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_PRODUCT_DELETED",
    targetType: "CatalogProduct",
    targetId: productId,
  });
}

// ─── Modifier Group CRUD ──────────────────────────────────────────────────────

export async function createBackofficeModifierGroup(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  input: CreateModifierGroupInput
): Promise<CatalogModifierGroup> {
  const group = await prisma.catalogModifierGroup.create({
    data: {
      tenantId,
      storeId,
      sourceType: "LOCAL",
      originType: "BEYOND_CREATED",
      name: input.name,
      description: input.description ?? null,
      selectionMin: input.selectionMin ?? 0,
      selectionMax: input.selectionMax ?? null,
      isRequired: input.isRequired ?? false,
      displayOrder: input.displayOrder ?? 0,
      isVisibleOnOnlineOrder: input.isVisibleOnOnlineOrder ?? true,
      isActive: true,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_MODIFIER_GROUP_CREATED",
    targetType: "CatalogModifierGroup",
    targetId: group.id,
    metadata: { name: input.name },
  });

  return group;
}

export async function updateBackofficeModifierGroup(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  groupId: string,
  input: UpdateModifierGroupInput
): Promise<CatalogModifierGroup> {
  const existing = await prisma.catalogModifierGroup.findUniqueOrThrow({
    where: { id: groupId },
    select: { storeId: true },
  });

  if (existing.storeId !== storeId) {
    throw new Error("Modifier group does not belong to this store");
  }

  // Phase 1: Beyond owns the catalog. All fields are editable regardless of origin.
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.selectionMin !== undefined) data.selectionMin = input.selectionMin;
  if (input.selectionMax !== undefined) data.selectionMax = input.selectionMax;
  if (input.isRequired !== undefined) data.isRequired = input.isRequired;
  if (input.displayOrder !== undefined) data.displayOrder = input.displayOrder;
  if (input.isVisibleOnOnlineOrder !== undefined)
    data.isVisibleOnOnlineOrder = input.isVisibleOnOnlineOrder;

  const group = await prisma.catalogModifierGroup.update({
    where: { id: groupId },
    data,
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_MODIFIER_GROUP_UPDATED",
    targetType: "CatalogModifierGroup",
    targetId: groupId,
    metadata: { changes: input },
  });

  return group;
}

export async function deleteBackofficeModifierGroup(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  groupId: string
): Promise<void> {
  const existing = await prisma.catalogModifierGroup.findUniqueOrThrow({
    where: { id: groupId },
    select: { storeId: true },
  });

  if (existing.storeId !== storeId) {
    throw new Error("Modifier group does not belong to this store");
  }

  // Phase 1: Beyond owns all catalog entities. Any modifier group can be soft-deleted.

  await prisma.catalogModifierGroup.update({
    where: { id: groupId },
    data: { deletedAt: new Date() },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_MODIFIER_GROUP_DELETED",
    targetType: "CatalogModifierGroup",
    targetId: groupId,
  });
}

// ─── Modifier Option CRUD ─────────────────────────────────────────────────────

export async function createBackofficeModifierOption(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  groupId: string,
  input: CreateModifierOptionInput
): Promise<CatalogModifierOption> {
  // Verify group belongs to this store
  await prisma.catalogModifierGroup.findUniqueOrThrow({
    where: { id: groupId, storeId },
    select: { id: true },
  });

  const option = await prisma.catalogModifierOption.create({
    data: {
      tenantId,
      storeId,
      modifierGroupId: groupId,
      sourceType: "LOCAL",
      originType: "BEYOND_CREATED",
      name: input.name,
      description: input.description ?? null,
      priceDeltaAmount: input.priceDeltaAmount ?? 0,
      currency: input.currency ?? "NZD",
      displayOrder: input.displayOrder ?? 0,
      isDefault: input.isDefault ?? false,
      isActive: true,
      isSoldOut: false,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_MODIFIER_OPTION_CREATED",
    targetType: "CatalogModifierOption",
    targetId: option.id,
    metadata: { groupId, name: input.name },
  });

  return option;
}

export async function updateBackofficeModifierOption(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  optionId: string,
  input: UpdateModifierOptionInput
): Promise<CatalogModifierOption> {
  const existing = await prisma.catalogModifierOption.findUniqueOrThrow({
    where: { id: optionId },
    select: { storeId: true },
  });

  if (existing.storeId !== storeId) {
    throw new Error("Modifier option does not belong to this store");
  }

  // Phase 1: Beyond owns the catalog. All fields are editable regardless of origin.
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.priceDeltaAmount !== undefined) data.priceDeltaAmount = input.priceDeltaAmount;
  if (input.displayOrder !== undefined) data.displayOrder = input.displayOrder;
  if (input.isDefault !== undefined) data.isDefault = input.isDefault;
  if (input.isSoldOut !== undefined) data.isSoldOut = input.isSoldOut;

  const option = await prisma.catalogModifierOption.update({
    where: { id: optionId },
    data,
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_MODIFIER_OPTION_UPDATED",
    targetType: "CatalogModifierOption",
    targetId: optionId,
    metadata: { changes: input },
  });

  return option;
}

export async function deleteBackofficeModifierOption(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  optionId: string
): Promise<void> {
  const existing = await prisma.catalogModifierOption.findUniqueOrThrow({
    where: { id: optionId },
    select: { storeId: true },
  });

  if (existing.storeId !== storeId) {
    throw new Error("Modifier option does not belong to this store");
  }

  // Phase 1: Beyond owns all catalog entities. Any modifier option can be soft-deleted.

  await prisma.catalogModifierOption.update({
    where: { id: optionId },
    data: { deletedAt: new Date() },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_MODIFIER_OPTION_DELETED",
    targetType: "CatalogModifierOption",
    targetId: optionId,
  });
}

// ─── Bulk / Reorder helpers ───────────────────────────────────────────────────

export async function bulkRestoreAvailability(
  storeId: string,
  tenantId: string,
  actorUserId: string
): Promise<number> {
  const result = await prisma.catalogProduct.updateMany({
    where: { storeId, isSoldOut: true, deletedAt: null },
    data: { isSoldOut: false },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_BULK_RESTORE_AVAILABILITY",
    targetType: "CatalogProduct",
    targetId: storeId,
    metadata: { restoredCount: result.count },
  });

  return result.count;
}

export async function reorderCategories(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  items: { id: string; displayOrder: number }[]
): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.catalogCategory.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      })
    )
  );

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "BACKOFFICE_CATEGORIES_REORDERED",
    targetType: "CatalogCategory",
    targetId: storeId,
    metadata: { count: items.length },
  });
}

// Re-export helper for routes that need to resolve tenantId from storeId
export { getStoreTenantId };
