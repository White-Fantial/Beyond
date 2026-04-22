/**
 * Owner Tenant Modifiers Service — manages tenant-level shared modifier groups.
 *
 * TenantModifierGroup is a modifier definition shared at the tenant level (no storeId).
 * Products can link multiple modifier groups (TenantProductModifierGroup).
 * Individual stores can override whether each group is enabled and its display order
 * via StoreModifierGroupSelection.
 */
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import type {
  TenantModifierGroupRow,
  TenantModifierOptionRow,
  TenantProductModifierGroupRow,
  StoreModifierGroupSelectionRow,
} from "@/types/owner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapOption(o: {
  id: string;
  tenantId: string;
  tenantModifierGroupId: string;
  name: string;
  priceDeltaAmount: number;
  currency: string;
  displayOrder: number;
  isDefault: boolean;
  isActive: boolean;
}): TenantModifierOptionRow {
  return {
    id: o.id,
    tenantId: o.tenantId,
    tenantModifierGroupId: o.tenantModifierGroupId,
    name: o.name,
    priceDeltaAmount: o.priceDeltaAmount,
    currency: o.currency,
    displayOrder: o.displayOrder,
    isDefault: o.isDefault,
    isActive: o.isActive,
  };
}

function mapGroup(g: {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  selectionMin: number;
  selectionMax: number | null;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  options: Array<{
    id: string;
    tenantId: string;
    tenantModifierGroupId: string;
    name: string;
    priceDeltaAmount: number;
    currency: string;
    displayOrder: number;
    isDefault: boolean;
    isActive: boolean;
  }>;
}): TenantModifierGroupRow {
  return {
    id: g.id,
    tenantId: g.tenantId,
    name: g.name,
    description: g.description,
    selectionMin: g.selectionMin,
    selectionMax: g.selectionMax,
    isRequired: g.isRequired,
    displayOrder: g.displayOrder,
    isActive: g.isActive,
    options: g.options.map(mapOption),
  };
}

// ─── Modifier Group CRUD ──────────────────────────────────────────────────────

export async function listTenantModifierGroups(tenantId: string): Promise<TenantModifierGroupRow[]> {
  const groups = await prisma.tenantModifierGroup.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      options: {
        where: { deletedAt: null },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
  return groups.map(mapGroup);
}

export interface CreateTenantModifierGroupInput {
  name: string;
  description?: string | null;
  selectionMin?: number;
  selectionMax?: number | null;
  isRequired?: boolean;
  displayOrder?: number;
}

export async function createTenantModifierGroup(
  tenantId: string,
  actorUserId: string,
  input: CreateTenantModifierGroupInput
): Promise<TenantModifierGroupRow> {
  const group = await prisma.tenantModifierGroup.create({
    data: {
      tenantId,
      name: input.name.trim(),
      description: input.description ?? null,
      selectionMin: input.selectionMin ?? 0,
      selectionMax: input.selectionMax ?? null,
      isRequired: input.isRequired ?? false,
      displayOrder: input.displayOrder ?? 0,
    },
    include: { options: { where: { deletedAt: null } } },
  });
  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_MODIFIER_GROUP_CREATED",
    targetType: "TenantModifierGroup",
    targetId: group.id,
    metadata: { name: input.name },
  });
  return mapGroup(group);
}

export interface UpdateTenantModifierGroupInput {
  name?: string;
  description?: string | null;
  selectionMin?: number;
  selectionMax?: number | null;
  isRequired?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export async function updateTenantModifierGroup(
  tenantId: string,
  groupId: string,
  actorUserId: string,
  data: UpdateTenantModifierGroupInput
): Promise<TenantModifierGroupRow> {
  await prisma.tenantModifierGroup.findFirstOrThrow({
    where: { id: groupId, tenantId, deletedAt: null },
  });
  const group = await prisma.tenantModifierGroup.update({
    where: { id: groupId },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.selectionMin !== undefined ? { selectionMin: data.selectionMin } : {}),
      ...(data.selectionMax !== undefined ? { selectionMax: data.selectionMax } : {}),
      ...(data.isRequired !== undefined ? { isRequired: data.isRequired } : {}),
      ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    include: {
      options: {
        where: { deletedAt: null },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      },
    },
  });
  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_MODIFIER_GROUP_UPDATED",
    targetType: "TenantModifierGroup",
    targetId: groupId,
    metadata: { fields: Object.keys(data) },
  });
  return mapGroup(group);
}

export async function deleteTenantModifierGroup(
  tenantId: string,
  groupId: string,
  actorUserId: string
): Promise<void> {
  await prisma.tenantModifierGroup.findFirstOrThrow({
    where: { id: groupId, tenantId, deletedAt: null },
  });
  await prisma.tenantModifierGroup.update({
    where: { id: groupId },
    data: { deletedAt: new Date() },
  });
  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_MODIFIER_GROUP_DELETED",
    targetType: "TenantModifierGroup",
    targetId: groupId,
    metadata: {},
  });
}

// ─── Modifier Option CRUD ─────────────────────────────────────────────────────

export interface CreateTenantModifierOptionInput {
  name: string;
  priceDeltaAmount?: number;
  currency?: string;
  displayOrder?: number;
  isDefault?: boolean;
}

export async function createTenantModifierOption(
  tenantId: string,
  groupId: string,
  actorUserId: string,
  input: CreateTenantModifierOptionInput
): Promise<TenantModifierOptionRow> {
  await prisma.tenantModifierGroup.findFirstOrThrow({
    where: { id: groupId, tenantId, deletedAt: null },
  });
  const option = await prisma.tenantModifierOption.create({
    data: {
      tenantId,
      tenantModifierGroupId: groupId,
      name: input.name.trim(),
      priceDeltaAmount: input.priceDeltaAmount ?? 0,
      currency: input.currency ?? "USD",
      displayOrder: input.displayOrder ?? 0,
      isDefault: input.isDefault ?? false,
    },
  });
  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_MODIFIER_OPTION_CREATED",
    targetType: "TenantModifierOption",
    targetId: option.id,
    metadata: { groupId, name: input.name },
  });
  return mapOption(option);
}

export interface UpdateTenantModifierOptionInput {
  name?: string;
  priceDeltaAmount?: number;
  currency?: string;
  displayOrder?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export async function updateTenantModifierOption(
  tenantId: string,
  groupId: string,
  optionId: string,
  actorUserId: string,
  data: UpdateTenantModifierOptionInput
): Promise<TenantModifierOptionRow> {
  await prisma.tenantModifierOption.findFirstOrThrow({
    where: { id: optionId, tenantModifierGroupId: groupId, tenantId, deletedAt: null },
  });
  const option = await prisma.tenantModifierOption.update({
    where: { id: optionId },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.priceDeltaAmount !== undefined ? { priceDeltaAmount: data.priceDeltaAmount } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
      ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_MODIFIER_OPTION_UPDATED",
    targetType: "TenantModifierOption",
    targetId: optionId,
    metadata: { groupId, fields: Object.keys(data) },
  });
  return mapOption(option);
}

export async function deleteTenantModifierOption(
  tenantId: string,
  groupId: string,
  optionId: string,
  actorUserId: string
): Promise<void> {
  await prisma.tenantModifierOption.findFirstOrThrow({
    where: { id: optionId, tenantModifierGroupId: groupId, tenantId, deletedAt: null },
  });
  await prisma.tenantModifierOption.update({
    where: { id: optionId },
    data: { deletedAt: new Date() },
  });
  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_MODIFIER_OPTION_DELETED",
    targetType: "TenantModifierOption",
    targetId: optionId,
    metadata: { groupId },
  });
}

// ─── Product ↔ Modifier Group Links ──────────────────────────────────────────

export async function listProductModifierGroups(
  tenantId: string,
  tenantProductId: string
): Promise<TenantProductModifierGroupRow[]> {
  const links = await prisma.tenantProductModifierGroup.findMany({
    where: { tenantProductId, tenantId },
    include: {
      modifierGroup: {
        include: {
          options: {
            where: { deletedAt: null },
            orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          },
        },
      },
    },
    orderBy: { displayOrder: "asc" },
  });
  return links.map((l) => ({
    id: l.id,
    tenantProductId: l.tenantProductId,
    tenantModifierGroupId: l.tenantModifierGroupId,
    displayOrder: l.displayOrder,
    modifierGroup: mapGroup(l.modifierGroup),
  }));
}

export async function linkModifierGroupToProduct(
  tenantId: string,
  tenantProductId: string,
  tenantModifierGroupId: string,
  actorUserId: string,
  displayOrder?: number
): Promise<TenantProductModifierGroupRow> {
  await prisma.tenantCatalogProduct.findFirstOrThrow({
    where: { id: tenantProductId, tenantId, deletedAt: null },
  });
  await prisma.tenantModifierGroup.findFirstOrThrow({
    where: { id: tenantModifierGroupId, tenantId, deletedAt: null },
  });
  const link = await prisma.tenantProductModifierGroup.upsert({
    where: {
      tenantProductId_tenantModifierGroupId: { tenantProductId, tenantModifierGroupId },
    },
    create: { tenantId, tenantProductId, tenantModifierGroupId, displayOrder: displayOrder ?? 0 },
    update: { displayOrder: displayOrder ?? 0 },
    include: {
      modifierGroup: {
        include: {
          options: {
            where: { deletedAt: null },
            orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          },
        },
      },
    },
  });
  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_PRODUCT_MODIFIER_LINKED",
    targetType: "TenantProductModifierGroup",
    targetId: link.id,
    metadata: { tenantProductId, tenantModifierGroupId },
  });
  return {
    id: link.id,
    tenantProductId: link.tenantProductId,
    tenantModifierGroupId: link.tenantModifierGroupId,
    displayOrder: link.displayOrder,
    modifierGroup: mapGroup(link.modifierGroup),
  };
}

export async function unlinkModifierGroupFromProduct(
  tenantId: string,
  tenantProductId: string,
  tenantModifierGroupId: string,
  actorUserId: string
): Promise<void> {
  const link = await prisma.tenantProductModifierGroup.findUnique({
    where: {
      tenantProductId_tenantModifierGroupId: { tenantProductId, tenantModifierGroupId },
    },
  });
  if (!link || link.tenantId !== tenantId) throw new Error("Modifier group link not found");
  await prisma.tenantProductModifierGroup.delete({
    where: { tenantProductId_tenantModifierGroupId: { tenantProductId, tenantModifierGroupId } },
  });
  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_PRODUCT_MODIFIER_UNLINKED",
    targetType: "TenantProductModifierGroup",
    targetId: link.id,
    metadata: { tenantProductId, tenantModifierGroupId },
  });
}

export async function reorderProductModifierGroups(
  tenantId: string,
  tenantProductId: string,
  actorUserId: string,
  orderedGroupIds: string[]
): Promise<void> {
  await prisma.$transaction(
    orderedGroupIds.map((id, idx) =>
      prisma.tenantProductModifierGroup.updateMany({
        where: { tenantProductId, tenantModifierGroupId: id, tenantId },
        data: { displayOrder: idx },
      })
    )
  );
  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "TENANT_PRODUCT_MODIFIERS_REORDERED",
    targetType: "TenantCatalogProduct",
    targetId: tenantProductId,
    metadata: { orderedGroupIds },
  });
}

// ─── Store Modifier Group Selections ──────────────────────────────────────────

export async function listStoreModifierGroupSelections(
  storeId: string,
  tenantId: string
): Promise<StoreModifierGroupSelectionRow[]> {
  const [allGroups, selections] = await Promise.all([
    prisma.tenantModifierGroup.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        options: {
          where: { deletedAt: null },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
    prisma.storeModifierGroupSelection.findMany({
      where: { storeId, tenantId },
    }),
  ]);

  const selectionMap = new Map(selections.map((s) => [s.tenantModifierGroupId, s]));

  return allGroups.map((g) => {
    const sel = selectionMap.get(g.id);
    const effectiveDisplayOrder = sel?.displayOrderOverride ?? g.displayOrder;
    return {
      tenantModifierGroupId: g.id,
      name: g.name,
      description: g.description,
      selectionMin: g.selectionMin,
      selectionMax: g.selectionMax,
      isRequired: g.isRequired,
      options: g.options.map(mapOption),
      effectiveDisplayOrder,
      displayOrderOverride: sel?.displayOrderOverride ?? null,
      isEnabled: sel?.isEnabled ?? true,
      selectionId: sel?.id ?? null,
    };
  }).sort((a, b) => a.effectiveDisplayOrder - b.effectiveDisplayOrder);
}

export async function upsertStoreModifierGroupSelection(
  storeId: string,
  tenantId: string,
  tenantModifierGroupId: string,
  actorUserId: string,
  data: { isEnabled?: boolean; displayOrderOverride?: number | null }
): Promise<void> {
  await prisma.tenantModifierGroup.findFirstOrThrow({
    where: { id: tenantModifierGroupId, tenantId, deletedAt: null },
  });
  await prisma.storeModifierGroupSelection.upsert({
    where: { storeId_tenantModifierGroupId: { storeId, tenantModifierGroupId } },
    create: {
      tenantId,
      storeId,
      tenantModifierGroupId,
      isEnabled: data.isEnabled ?? true,
      displayOrderOverride: data.displayOrderOverride ?? null,
    },
    update: {
      ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
      ...(data.displayOrderOverride !== undefined
        ? { displayOrderOverride: data.displayOrderOverride }
        : {}),
    },
  });
  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "STORE_MODIFIER_SELECTION_UPDATED",
    targetType: "StoreModifierGroupSelection",
    targetId: tenantModifierGroupId,
    metadata: { storeId, tenantModifierGroupId, ...data },
  });
}

export async function reorderStoreModifierGroupSelections(
  storeId: string,
  tenantId: string,
  actorUserId: string,
  orderedGroupIds: string[]
): Promise<void> {
  await prisma.$transaction(
    orderedGroupIds.map((tenantModifierGroupId, idx) =>
      prisma.storeModifierGroupSelection.upsert({
        where: { storeId_tenantModifierGroupId: { storeId, tenantModifierGroupId } },
        create: { tenantId, storeId, tenantModifierGroupId, displayOrderOverride: idx },
        update: { displayOrderOverride: idx },
      })
    )
  );
  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "STORE_MODIFIER_SELECTIONS_REORDERED",
    targetType: "Store",
    targetId: storeId,
    metadata: { orderedGroupIds },
  });
}
