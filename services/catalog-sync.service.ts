/**
 * Loyverse full catalog sync service.
 *
 * Orchestrates a complete sync from Loyverse to the internal catalog:
 * 1. Fetch raw data from Loyverse API.
 * 2. Persist raw mirror rows (external_catalog_* tables).
 * 3. Upsert internal catalog entities (catalog_* tables) using origin keys.
 * 4. Upsert relational links (product–category, product–modifier group).
 * 5. Upsert channel_entity_mapping rows.
 *
 * Phase 1 — internal catalog ownership:
 * - The Beyond internal catalog is the canonical operational model.
 * - This sync populates internal catalog rows on first import (provenance = IMPORTED_FROM_POS).
 * - Subsequent syncs update internal catalog data, but internal edits made in Beyond
 *   are NOT protected by any source lock — they are valid Beyond-side changes.
 * - TODO Phase 2: add conflict-resolution policy before syncing again overwrites Beyond edits.
 *
 * Matching is done by origin keys (originConnectionId + originExternalRef), with
 * fallback to legacy keys (sourceOfTruthConnectionId + source*Ref) for backward compat.
 *
 * Never matches by name.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LoyverseClient } from "@/lib/integrations/loyverse/client";
import {
  parseLoyverseCategory,
  parseLoyverseModifierGroup,
  parseLoyverseItem,
} from "@/lib/integrations/loyverse/parser";

export interface LoyverseSyncInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  accessToken: string;
}

export interface LoyverseSyncResult {
  categories: { created: number; updated: number };
  products: { created: number; updated: number };
  modifierGroups: { created: number; updated: number };
  modifierOptions: { created: number; updated: number };
  productCategories: { created: number; deactivated: number };
  productModifierGroups: { created: number; deactivated: number };
  mappings: { created: number; updated: number };
}

export async function runLoyverseFullCatalogSync(
  input: LoyverseSyncInput
): Promise<LoyverseSyncResult> {
  const { tenantId, storeId, connectionId, accessToken } = input;
  const client = new LoyverseClient(accessToken);

  const result: LoyverseSyncResult = {
    categories: { created: 0, updated: 0 },
    products: { created: 0, updated: 0 },
    modifierGroups: { created: 0, updated: 0 },
    modifierOptions: { created: 0, updated: 0 },
    productCategories: { created: 0, deactivated: 0 },
    productModifierGroups: { created: 0, deactivated: 0 },
    mappings: { created: 0, updated: 0 },
  };

  const now = new Date();

  // ── 1. Fetch raw data ──────────────────────────────────────────────────────
  const [rawCategories, rawModifierGroups, rawItems] = await Promise.all([
    client.fetchAllCategories(),
    client.fetchAllModifierGroups(),
    client.fetchAllItems(),
  ]);

  // ── 2. Persist raw mirror rows ─────────────────────────────────────────────

  // External categories
  for (const raw of rawCategories) {
    const parsed = parseLoyverseCategory(raw);
    await prisma.externalCatalogCategory.upsert({
      where: { connectionId_externalId: { connectionId, externalId: parsed.externalId } },
      create: {
        tenantId,
        storeId,
        connectionId,
        channelType: "LOYVERSE",
        externalId: parsed.externalId,
        normalizedName: parsed.normalizedName,
        rawPayload: parsed.rawPayload as object,
        externalUpdatedAt: parsed.externalUpdatedAt,
        lastSyncedAt: now,
        updatedAt: now,
      },
      update: {
        normalizedName: parsed.normalizedName,
        rawPayload: parsed.rawPayload as object,
        externalUpdatedAt: parsed.externalUpdatedAt,
        lastSyncedAt: now,
        updatedAt: now,
      },
    });
  }

  // External modifier groups + their options (as raw payload)
  for (const raw of rawModifierGroups) {
    const parsed = parseLoyverseModifierGroup(raw);
    await prisma.externalCatalogModifierGroup.upsert({
      where: { connectionId_externalId: { connectionId, externalId: parsed.externalId } },
      create: {
        tenantId,
        storeId,
        connectionId,
        channelType: "LOYVERSE",
        externalId: parsed.externalId,
        normalizedName: parsed.normalizedName,
        rawPayload: parsed.rawPayload as object,
        externalUpdatedAt: parsed.externalUpdatedAt,
        lastSyncedAt: now,
        updatedAt: now,
      },
      update: {
        normalizedName: parsed.normalizedName,
        rawPayload: parsed.rawPayload as object,
        externalUpdatedAt: parsed.externalUpdatedAt,
        lastSyncedAt: now,
        updatedAt: now,
      },
    });

    // Mirror each modifier option
    for (const opt of parsed.options) {
      await prisma.externalCatalogModifierOption.upsert({
        where: { connectionId_externalId: { connectionId, externalId: opt.externalId } },
        create: {
          tenantId,
          storeId,
          connectionId,
          channelType: "LOYVERSE",
          externalId: opt.externalId,
          externalParentId: parsed.externalId,
          normalizedName: opt.normalizedName,
          normalizedPriceAmount: opt.normalizedPriceAmount,
          rawPayload: opt.rawPayload as object,
          lastSyncedAt: now,
          updatedAt: now,
        },
        update: {
          externalParentId: parsed.externalId,
          normalizedName: opt.normalizedName,
          normalizedPriceAmount: opt.normalizedPriceAmount,
          rawPayload: opt.rawPayload as object,
          lastSyncedAt: now,
          updatedAt: now,
        },
      });
    }
  }

  // External products + product-modifier-group links
  for (const raw of rawItems) {
    const parsed = parseLoyverseItem(raw);
    await prisma.externalCatalogProduct.upsert({
      where: { connectionId_externalId: { connectionId, externalId: parsed.externalId } },
      create: {
        tenantId,
        storeId,
        connectionId,
        channelType: "LOYVERSE",
        externalId: parsed.externalId,
        externalParentId: parsed.externalParentId,
        normalizedName: parsed.normalizedName,
        normalizedPriceAmount: parsed.normalizedPriceAmount,
        rawPayload: parsed.rawPayload as object,
        externalUpdatedAt: parsed.externalUpdatedAt,
        lastSyncedAt: now,
        updatedAt: now,
      },
      update: {
        externalParentId: parsed.externalParentId,
        normalizedName: parsed.normalizedName,
        normalizedPriceAmount: parsed.normalizedPriceAmount,
        rawPayload: parsed.rawPayload as object,
        externalUpdatedAt: parsed.externalUpdatedAt,
        lastSyncedAt: now,
        updatedAt: now,
      },
    });

    // Mirror product–modifier group links
    for (const mgId of parsed.modifierGroupIds) {
      await prisma.externalCatalogProductModifierGroupLink.upsert({
        where: {
          connectionId_externalProductId_externalModifierGroupId: {
            connectionId,
            externalProductId: parsed.externalId,
            externalModifierGroupId: mgId,
          },
        },
        create: {
          tenantId,
          storeId,
          connectionId,
          channelType: "LOYVERSE",
          externalProductId: parsed.externalId,
          externalModifierGroupId: mgId,
          rawPayload: Prisma.JsonNull,
          lastSyncedAt: now,
          updatedAt: now,
        },
        update: {
          lastSyncedAt: now,
          updatedAt: now,
        },
      });
    }
  }

  // ── 3. Upsert internal catalog categories ──────────────────────────────────

  // Map externalId -> internal CatalogCategory id
  const categoryIdMap = new Map<string, string>();

  for (const raw of rawCategories) {
    const parsed = parseLoyverseCategory(raw);

    const existing = await prisma.catalogCategory.findFirst({
      where: {
        storeId,
        sourceOfTruthConnectionId: connectionId,
        sourceCategoryRef: parsed.externalId,
        deletedAt: null,
      },
    });

    if (existing) {
      await prisma.catalogCategory.update({
        where: { id: existing.id },
        data: {
          name: parsed.normalizedName,
          updatedAt: now,
        },
      });
      categoryIdMap.set(parsed.externalId, existing.id);
      result.categories.updated++;
    } else {
      const created = await prisma.catalogCategory.create({
        data: {
          tenantId,
          storeId,
          sourceType: "POS",
          // Phase 1: provenance — this entity was initially imported from a POS system.
          originType: "IMPORTED_FROM_POS",
          originConnectionId: connectionId,
          originExternalRef: parsed.externalId,
          importedAt: now,
          sourceOfTruthConnectionId: connectionId,
          sourceCategoryRef: parsed.externalId,
          name: parsed.normalizedName,
          updatedAt: now,
        },
      });
      categoryIdMap.set(parsed.externalId, created.id);
      result.categories.created++;
    }
  }

  // ── 4. Upsert internal modifier groups + options ───────────────────────────

  // Map externalId -> internal CatalogModifierGroup id
  const modifierGroupIdMap = new Map<string, string>();

  for (const raw of rawModifierGroups) {
    const parsed = parseLoyverseModifierGroup(raw);

    const existingGroup = await prisma.catalogModifierGroup.findFirst({
      where: {
        storeId,
        sourceOfTruthConnectionId: connectionId,
        sourceModifierGroupRef: parsed.externalId,
        deletedAt: null,
      },
    });

    let internalGroupId: string;

    if (existingGroup) {
      await prisma.catalogModifierGroup.update({
        where: { id: existingGroup.id },
        data: {
          name: parsed.normalizedName,
          updatedAt: now,
        },
      });
      internalGroupId = existingGroup.id;
      result.modifierGroups.updated++;
    } else {
      const created = await prisma.catalogModifierGroup.create({
        data: {
          tenantId,
          storeId,
          sourceType: "POS",
          // Phase 1: provenance — this entity was initially imported from a POS system.
          originType: "IMPORTED_FROM_POS",
          originConnectionId: connectionId,
          originExternalRef: parsed.externalId,
          importedAt: now,
          sourceOfTruthConnectionId: connectionId,
          sourceModifierGroupRef: parsed.externalId,
          name: parsed.normalizedName,
          updatedAt: now,
        },
      });
      internalGroupId = created.id;
      result.modifierGroups.created++;
    }

    modifierGroupIdMap.set(parsed.externalId, internalGroupId);

    // Upsert modifier options
    for (const opt of parsed.options) {
      const existingOpt = await prisma.catalogModifierOption.findFirst({
        where: {
          storeId,
          sourceOfTruthConnectionId: connectionId,
          sourceModifierOptionRef: opt.externalId,
          deletedAt: null,
        },
      });

      if (existingOpt) {
        await prisma.catalogModifierOption.update({
          where: { id: existingOpt.id },
          data: {
            name: opt.normalizedName,
            priceDeltaAmount: opt.normalizedPriceAmount,
            modifierGroupId: internalGroupId,
            updatedAt: now,
          },
        });
        result.modifierOptions.updated++;
      } else {
        await prisma.catalogModifierOption.create({
          data: {
            tenantId,
            storeId,
            modifierGroupId: internalGroupId,
            sourceType: "POS",
            // Phase 1: provenance — this entity was initially imported from a POS system.
            originType: "IMPORTED_FROM_POS",
            originConnectionId: connectionId,
            originExternalRef: opt.externalId,
            importedAt: now,
            sourceOfTruthConnectionId: connectionId,
            sourceModifierOptionRef: opt.externalId,
            name: opt.normalizedName,
            priceDeltaAmount: opt.normalizedPriceAmount,
            updatedAt: now,
          },
        });
        result.modifierOptions.created++;
      }
    }
  }

  // ── 5. Upsert internal products ───────────────────────────────────────────

  // Build reverse map: internal modifier group id -> external modifier group id
  // Used to check whether an existing pmg link is still present in Loyverse.
  const internalToExternalMgId = new Map<string, string>(
    Array.from(modifierGroupIdMap.entries()).map(([extId, intId]) => [intId, extId])
  );

  // Map externalId -> internal CatalogProduct id
  const productIdMap = new Map<string, string>();

  for (const raw of rawItems) {
    const parsed = parseLoyverseItem(raw);

    const existing = await prisma.catalogProduct.findFirst({
      where: {
        storeId,
        sourceOfTruthConnectionId: connectionId,
        sourceProductRef: parsed.externalId,
        deletedAt: null,
      },
    });

    let internalProductId: string;

    if (existing) {
      await prisma.catalogProduct.update({
        where: { id: existing.id },
        data: {
          name: parsed.normalizedName,
          basePriceAmount: parsed.normalizedPriceAmount,
          updatedAt: now,
        },
      });
      internalProductId = existing.id;
      result.products.updated++;
    } else {
      const created = await prisma.catalogProduct.create({
        data: {
          tenantId,
          storeId,
          sourceType: "POS",
          // Phase 1: provenance — this entity was initially imported from a POS system.
          originType: "IMPORTED_FROM_POS",
          originConnectionId: connectionId,
          originExternalRef: parsed.externalId,
          importedAt: now,
          sourceOfTruthConnectionId: connectionId,
          sourceProductRef: parsed.externalId,
          name: parsed.normalizedName,
          basePriceAmount: parsed.normalizedPriceAmount,
          updatedAt: now,
        },
      });
      internalProductId = created.id;
      result.products.created++;
    }

    productIdMap.set(parsed.externalId, internalProductId);

    // ── 5a. Product–Category links ──────────────────────────────────────────

    const internalCategoryId = parsed.externalParentId
      ? categoryIdMap.get(parsed.externalParentId)
      : undefined;

    if (internalCategoryId) {
      const existingLink = await prisma.catalogProductCategory.findUnique({
        where: { productId_categoryId: { productId: internalProductId, categoryId: internalCategoryId } },
      });
      if (!existingLink) {
        await prisma.catalogProductCategory.create({
          data: {
            tenantId,
            storeId,
            productId: internalProductId,
            categoryId: internalCategoryId,
            isPrimary: true,
          },
        });
        result.productCategories.created++;
      }
    }

    // ── 5b. Product–ModifierGroup links ────────────────────────────────────

    const incomingModGroupExternalIds = new Set(parsed.modifierGroupIds);

    // Deactivate links no longer present in Loyverse
    const existingPmgLinks = await prisma.catalogProductModifierGroup.findMany({
      where: { productId: internalProductId, isActive: true },
    });

    for (const link of existingPmgLinks) {
      // Use reverse map O(1) lookup instead of linear scan
      const externalMgId = internalToExternalMgId.get(link.modifierGroupId);

      if (externalMgId && !incomingModGroupExternalIds.has(externalMgId)) {
        await prisma.catalogProductModifierGroup.update({
          where: { id: link.id },
          data: { isActive: false, updatedAt: now },
        });
        result.productModifierGroups.deactivated++;
      }
    }

    // Upsert incoming links
    for (const extMgId of parsed.modifierGroupIds) {
      const internalMgId = modifierGroupIdMap.get(extMgId);
      if (!internalMgId) continue;

      const existingLink = await prisma.catalogProductModifierGroup.findUnique({
        where: { productId_modifierGroupId: { productId: internalProductId, modifierGroupId: internalMgId } },
      });

      if (existingLink) {
        if (!existingLink.isActive) {
          await prisma.catalogProductModifierGroup.update({
            where: { id: existingLink.id },
            data: { isActive: true, updatedAt: now },
          });
        }
      } else {
        await prisma.catalogProductModifierGroup.create({
          data: {
            tenantId,
            storeId,
            productId: internalProductId,
            modifierGroupId: internalMgId,
            updatedAt: now,
          },
        });
        result.productModifierGroups.created++;
      }
    }
  }

  // ── 6. Upsert channel_entity_mapping rows ─────────────────────────────────

  // Categories
  for (const [externalId, internalId] of categoryIdMap) {
    const { created, updated } = await upsertMapping({
      tenantId,
      storeId,
      connectionId,
      entityType: "CATEGORY",
      internalEntityId: internalId,
      externalEntityId: externalId,
      now,
    });
    result.mappings.created += created;
    result.mappings.updated += updated;
  }

  // Modifier groups
  for (const [externalId, internalId] of modifierGroupIdMap) {
    const { created, updated } = await upsertMapping({
      tenantId,
      storeId,
      connectionId,
      entityType: "MODIFIER_GROUP",
      internalEntityId: internalId,
      externalEntityId: externalId,
      now,
    });
    result.mappings.created += created;
    result.mappings.updated += updated;
  }

  // Modifier options (fetch from DB to get their ids)
  const internalModifierOptions = await prisma.catalogModifierOption.findMany({
    where: {
      storeId,
      sourceOfTruthConnectionId: connectionId,
      deletedAt: null,
    },
    select: { id: true, sourceModifierOptionRef: true, modifierGroupId: true },
  });

  for (const opt of internalModifierOptions) {
    if (!opt.sourceModifierOptionRef) continue;
    const { created, updated } = await upsertMapping({
      tenantId,
      storeId,
      connectionId,
      entityType: "MODIFIER_OPTION",
      internalEntityId: opt.id,
      externalEntityId: opt.sourceModifierOptionRef,
      now,
    });
    result.mappings.created += created;
    result.mappings.updated += updated;
  }

  // Products
  for (const [externalId, internalId] of productIdMap) {
    const { created, updated } = await upsertMapping({
      tenantId,
      storeId,
      connectionId,
      entityType: "PRODUCT",
      internalEntityId: internalId,
      externalEntityId: externalId,
      now,
    });
    result.mappings.created += created;
    result.mappings.updated += updated;
  }

  console.log(
    `[LoyverseSync] ${tenantId}/${storeId} — ` +
      `categories: +${result.categories.created} ~${result.categories.updated}, ` +
      `products: +${result.products.created} ~${result.products.updated}, ` +
      `modGroups: +${result.modifierGroups.created} ~${result.modifierGroups.updated}, ` +
      `modOptions: +${result.modifierOptions.created} ~${result.modifierOptions.updated}, ` +
      `pmgLinks: +${result.productModifierGroups.created} -${result.productModifierGroups.deactivated}, ` +
      `mappings: +${result.mappings.created} ~${result.mappings.updated}`
  );

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertMapping(args: {
  tenantId: string;
  storeId: string;
  connectionId: string;
  entityType: "CATEGORY" | "PRODUCT" | "MODIFIER_GROUP" | "MODIFIER_OPTION";
  internalEntityId: string;
  externalEntityId: string;
  now: Date;
}): Promise<{ created: number; updated: number }> {
  const { tenantId, storeId, connectionId, entityType, internalEntityId, externalEntityId, now } =
    args;

  const existing = await prisma.channelEntityMapping.findUnique({
    where: {
      connectionId_entityType_internalEntityId: {
        connectionId,
        entityType,
        internalEntityId,
      },
    },
  });

  if (existing) {
    await prisma.channelEntityMapping.update({
      where: { id: existing.id },
      data: {
        externalEntityId,
        mappingStatus: "ACTIVE",
        lastVerifiedAt: now,
        updatedAt: now,
      },
    });
    return { created: 0, updated: 1 };
  }

  await prisma.channelEntityMapping.create({
    data: {
      tenantId,
      storeId,
      entityType,
      internalEntityId,
      connectionId,
      channelType: "LOYVERSE",
      externalEntityId,
      mappingStatus: "ACTIVE",
      lastVerifiedAt: now,
      updatedAt: now,
    },
  });
  return { created: 1, updated: 0 };
}
