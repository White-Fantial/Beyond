/**
 * Catalog Import Service — Phase 2: External Catalog Import Foundation.
 *
 * Orchestrates a full catalog import from an external channel connection:
 *   1. Creates a CatalogImportRun record (status=RUNNING).
 *   2. Delegates raw data fetching to the provider adapter.
 *   3. For each entity: persists a raw ExternalCatalogSnapshot + upserts the
 *      ExternalCatalog* normalised mirror row with an entityHash fingerprint.
 *   4. Upserts product–category and product–modifier-group link rows.
 *   5. Marks the run SUCCEEDED (or FAILED on error).
 *
 * Constraints (Phase 2):
 *   - External data NEVER flows into the internal catalog tables (catalog_*).
 *   - No mapping, conflict detection, or publish logic.
 *   - Internal catalog is completely unaffected.
 *
 * TODO Phase 3:
 *   - channel_entity_mappings — auto match / manual match UI
 *   - internal ↔ external entity linking
 *
 * TODO Phase 4:
 *   - publish engine
 *   - outbound sync
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createCatalogAdapter } from "@/adapters/catalog";
import { detectExternalChangesForImportRun } from "./external-change-detection.service";
import type { RawCatalogCategory, RawCatalogProduct, RawCatalogModifierGroup, RawCatalogModifierOption } from "@/adapters/catalog/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CatalogImportInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  /** Provider string, e.g. "LOYVERSE", "UBER_EATS", "DOORDASH". */
  provider: string;
  /** Raw credentials forwarded to the adapter (e.g. { accessToken, configEncrypted }). */
  credentials: Record<string, string>;
}

export interface CatalogImportResult {
  importRunId: string;
  status: "SUCCEEDED" | "FAILED";
  importedCategoriesCount: number;
  importedProductsCount: number;
  importedModifierGroupsCount: number;
  importedModifierOptionsCount: number;
  errorMessage?: string;
}

// ─── Hash helpers ─────────────────────────────────────────────────────────────

/** SHA-256 of the full JSON payload (for snapshot dedup). */
function hashPayload(payload: Record<string, unknown>): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

/**
 * Fingerprint of the normalised key fields for each entity type.
 * Only includes fields that matter for a future diff — NOT the full raw payload.
 */
function hashCategoryEntity(name: string | null | undefined): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ name: (name ?? "").trim() }))
    .digest("hex");
}

function hashProductEntity(fields: {
  name: string | null | undefined;
  priceAmount: number | null | undefined;
  isActive?: boolean | null;
  isSoldOut?: boolean | null;
}): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        name: (fields.name ?? "").trim(),
        priceAmount: fields.priceAmount ?? null,
        isActive: fields.isActive ?? null,
        isSoldOut: fields.isSoldOut ?? null,
      })
    )
    .digest("hex");
}

function hashModifierGroupEntity(fields: {
  name: string | null | undefined;
  minSelect?: number | null;
  maxSelect?: number | null;
}): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        name: (fields.name ?? "").trim(),
        minSelect: fields.minSelect ?? null,
        maxSelect: fields.maxSelect ?? null,
      })
    )
    .digest("hex");
}

function hashModifierOptionEntity(fields: {
  name: string | null | undefined;
  priceAmount: number | null | undefined;
  groupExternalId: string;
}): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        name: (fields.name ?? "").trim(),
        priceAmount: fields.priceAmount ?? null,
        groupExternalId: fields.groupExternalId,
      })
    )
    .digest("hex");
}

// ─── Loyverse-specific field extraction ──────────────────────────────────────
// Helpers that pluck normalised values from raw Loyverse payloads.
// Other providers can add their own helpers as adapters are implemented.

function extractCategoryName(raw: Record<string, unknown>): string | null {
  return typeof raw["name"] === "string" ? (raw["name"] as string).trim() : null;
}

function extractItemName(raw: Record<string, unknown>): string | null {
  if (typeof raw["item_name"] === "string") return (raw["item_name"] as string).trim();
  if (typeof raw["name"] === "string") return (raw["name"] as string).trim();
  return null;
}

function extractItemPrice(raw: Record<string, unknown>): number | null {
  const variants = raw["variants"];
  if (Array.isArray(variants) && variants.length > 0) {
    const first = variants[0] as Record<string, unknown>;
    if (typeof first["price"] === "number") return Math.round(first["price"] * 100);
  }
  if (typeof raw["price"] === "number") return Math.round((raw["price"] as number) * 100);
  return null;
}

function extractModifierGroupName(raw: Record<string, unknown>): string | null {
  return typeof raw["name"] === "string" ? (raw["name"] as string).trim() : null;
}

function extractModifierOptionName(raw: Record<string, unknown>): string | null {
  return typeof raw["name"] === "string" ? (raw["name"] as string).trim() : null;
}

function extractModifierOptionPrice(raw: Record<string, unknown>): number | null {
  if (typeof raw["price"] === "number") return Math.round((raw["price"] as number) * 100);
  return null;
}

// ─── Main import function ─────────────────────────────────────────────────────

export async function runFullCatalogImport(
  input: CatalogImportInput
): Promise<CatalogImportResult> {
  const { tenantId, storeId, connectionId, provider, credentials } = input;
  const now = new Date();

  // 1. Create import run (status = RUNNING)
  const importRun = await prisma.catalogImportRun.create({
    data: {
      tenantId,
      storeId,
      connectionId,
      provider,
      status: "RUNNING",
      startedAt: now,
    },
  });

  const importRunId = importRun.id;

  try {
    // 2. Fetch raw data from provider adapter
    const adapter = createCatalogAdapter(provider);
    const catalog = await adapter.fetchFullCatalog({ connectionId, credentials });

    let catCount = 0;
    let prodCount = 0;
    let mgCount = 0;
    let moCount = 0;

    // 3a. Process categories
    for (const cat of catalog.categories) {
      await persistCategory({ tenantId, storeId, connectionId, provider, importRunId, cat, now });
      catCount++;
    }

    // 3b. Process modifier groups (before products so links resolve)
    for (const mg of catalog.modifierGroups) {
      await persistModifierGroup({ tenantId, storeId, connectionId, provider, importRunId, mg, now });
      mgCount++;
    }

    // 3c. Process modifier options
    for (const mo of catalog.modifierOptions) {
      await persistModifierOption({ tenantId, storeId, connectionId, provider, importRunId, mo, now });
      moCount++;
    }

    // 3d. Process products
    for (const prod of catalog.products) {
      await persistProduct({ tenantId, storeId, connectionId, provider, importRunId, prod, now });
      prodCount++;
    }

    // 4. Upsert link rows (product–category, product–modifier-group)
    for (const link of catalog.productModifierGroupLinks) {
      await prisma.externalCatalogProductModifierGroupLink.upsert({
        where: {
          connectionId_externalProductId_externalModifierGroupId: {
            connectionId,
            externalProductId: link.productExternalId,
            externalModifierGroupId: link.groupExternalId,
          },
        },
        create: {
          tenantId,
          storeId,
          connectionId,
          channelType: providerToChannelType(provider),
          externalProductId: link.productExternalId,
          externalModifierGroupId: link.groupExternalId,
          importRunId,
          lastSyncedAt: now,
          updatedAt: now,
        },
        update: {
          importRunId,
          lastSyncedAt: now,
          updatedAt: now,
        },
      });
    }

    // 5. Mark run SUCCEEDED
    await prisma.catalogImportRun.update({
      where: { id: importRunId },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date(),
        importedCategoriesCount: catCount,
        importedProductsCount: prodCount,
        importedModifierGroupsCount: mgCount,
        importedModifierOptionsCount: moCount,
      },
    });

    // 6. Trigger external change detection (Phase 5).
    //    Failure here does NOT affect the import result — diff errors are
    //    recorded in importRun.diffStatus only.
    detectExternalChangesForImportRun({ importRunId }).catch((err) => {
      console.error(`[catalog-import] change-detection failed for run ${importRunId}:`, err);
    });

    return {
      importRunId,
      status: "SUCCEEDED",
      importedCategoriesCount: catCount,
      importedProductsCount: prodCount,
      importedModifierGroupsCount: mgCount,
      importedModifierOptionsCount: moCount,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await prisma.catalogImportRun.update({
      where: { id: importRunId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage,
      },
    });

    return {
      importRunId,
      status: "FAILED",
      importedCategoriesCount: 0,
      importedProductsCount: 0,
      importedModifierGroupsCount: 0,
      importedModifierOptionsCount: 0,
      errorMessage,
    };
  }
}

// ─── Per-entity persist helpers ───────────────────────────────────────────────

async function persistCategory(args: {
  tenantId: string;
  storeId: string;
  connectionId: string;
  provider: string;
  importRunId: string;
  cat: RawCatalogCategory;
  now: Date;
}): Promise<void> {
  const { tenantId, storeId, connectionId, provider, importRunId, cat, now } = args;

  // Raw snapshot
  const payloadChecksum = hashPayload(cat.raw);
  await prisma.externalCatalogSnapshot.create({
    data: {
      tenantId,
      storeId,
      connectionId,
      entityType: "CATEGORY",
      externalEntityId: cat.externalId,
      payload: cat.raw,
      payloadChecksum,
      fetchedAt: now,
      importRunId,
    },
  });

  // Normalised mirror + entityHash
  const name = extractCategoryName(cat.raw);
  const entityHash = hashCategoryEntity(name);

  await prisma.externalCatalogCategory.upsert({
    where: { connectionId_externalId: { connectionId, externalId: cat.externalId } },
    create: {
      tenantId,
      storeId,
      connectionId,
      channelType: providerToChannelType(provider),
      externalId: cat.externalId,
      normalizedName: name,
      rawPayload: cat.raw,
      syncChecksum: payloadChecksum,
      entityHash,
      importRunId,
      lastSyncedAt: now,
      updatedAt: now,
    },
    update: {
      normalizedName: name,
      rawPayload: cat.raw,
      syncChecksum: payloadChecksum,
      entityHash,
      importRunId,
      lastSyncedAt: now,
      updatedAt: now,
    },
  });
}

async function persistModifierGroup(args: {
  tenantId: string;
  storeId: string;
  connectionId: string;
  provider: string;
  importRunId: string;
  mg: RawCatalogModifierGroup;
  now: Date;
}): Promise<void> {
  const { tenantId, storeId, connectionId, provider, importRunId, mg, now } = args;

  const payloadChecksum = hashPayload(mg.raw);
  await prisma.externalCatalogSnapshot.create({
    data: {
      tenantId,
      storeId,
      connectionId,
      entityType: "MODIFIER_GROUP",
      externalEntityId: mg.externalId,
      payload: mg.raw,
      payloadChecksum,
      fetchedAt: now,
      importRunId,
    },
  });

  const name = extractModifierGroupName(mg.raw);
  const entityHash = hashModifierGroupEntity({ name });

  await prisma.externalCatalogModifierGroup.upsert({
    where: { connectionId_externalId: { connectionId, externalId: mg.externalId } },
    create: {
      tenantId,
      storeId,
      connectionId,
      channelType: providerToChannelType(provider),
      externalId: mg.externalId,
      normalizedName: name,
      rawPayload: mg.raw,
      syncChecksum: payloadChecksum,
      entityHash,
      importRunId,
      lastSyncedAt: now,
      updatedAt: now,
    },
    update: {
      normalizedName: name,
      rawPayload: mg.raw,
      syncChecksum: payloadChecksum,
      entityHash,
      importRunId,
      lastSyncedAt: now,
      updatedAt: now,
    },
  });
}

async function persistModifierOption(args: {
  tenantId: string;
  storeId: string;
  connectionId: string;
  provider: string;
  importRunId: string;
  mo: RawCatalogModifierOption;
  now: Date;
}): Promise<void> {
  const { tenantId, storeId, connectionId, provider, importRunId, mo, now } = args;

  const payloadChecksum = hashPayload(mo.raw);
  await prisma.externalCatalogSnapshot.create({
    data: {
      tenantId,
      storeId,
      connectionId,
      entityType: "MODIFIER_OPTION",
      externalEntityId: mo.externalId,
      payload: mo.raw,
      payloadChecksum,
      fetchedAt: now,
      importRunId,
    },
  });

  const name = extractModifierOptionName(mo.raw);
  const priceAmount = extractModifierOptionPrice(mo.raw);
  const entityHash = hashModifierOptionEntity({
    name,
    priceAmount,
    groupExternalId: mo.groupExternalId,
  });

  await prisma.externalCatalogModifierOption.upsert({
    where: { connectionId_externalId: { connectionId, externalId: mo.externalId } },
    create: {
      tenantId,
      storeId,
      connectionId,
      channelType: providerToChannelType(provider),
      externalId: mo.externalId,
      externalParentId: mo.groupExternalId,
      normalizedName: name,
      normalizedPriceAmount: priceAmount,
      rawPayload: mo.raw,
      syncChecksum: payloadChecksum,
      entityHash,
      importRunId,
      lastSyncedAt: now,
      updatedAt: now,
    },
    update: {
      externalParentId: mo.groupExternalId,
      normalizedName: name,
      normalizedPriceAmount: priceAmount,
      rawPayload: mo.raw,
      syncChecksum: payloadChecksum,
      entityHash,
      importRunId,
      lastSyncedAt: now,
      updatedAt: now,
    },
  });
}

async function persistProduct(args: {
  tenantId: string;
  storeId: string;
  connectionId: string;
  provider: string;
  importRunId: string;
  prod: RawCatalogProduct;
  now: Date;
}): Promise<void> {
  const { tenantId, storeId, connectionId, provider, importRunId, prod, now } = args;

  const payloadChecksum = hashPayload(prod.raw);
  await prisma.externalCatalogSnapshot.create({
    data: {
      tenantId,
      storeId,
      connectionId,
      entityType: "PRODUCT",
      externalEntityId: prod.externalId,
      payload: prod.raw,
      payloadChecksum,
      fetchedAt: now,
      importRunId,
    },
  });

  const name = extractItemName(prod.raw);
  const priceAmount = extractItemPrice(prod.raw);
  const entityHash = hashProductEntity({ name, priceAmount });

  const primaryCategoryId = prod.categoryExternalIds[0] ?? null;

  await prisma.externalCatalogProduct.upsert({
    where: { connectionId_externalId: { connectionId, externalId: prod.externalId } },
    create: {
      tenantId,
      storeId,
      connectionId,
      channelType: providerToChannelType(provider),
      externalId: prod.externalId,
      externalParentId: primaryCategoryId,
      normalizedName: name,
      normalizedPriceAmount: priceAmount,
      rawPayload: prod.raw,
      syncChecksum: payloadChecksum,
      entityHash,
      importRunId,
      lastSyncedAt: now,
      updatedAt: now,
    },
    update: {
      externalParentId: primaryCategoryId,
      normalizedName: name,
      normalizedPriceAmount: priceAmount,
      rawPayload: prod.raw,
      syncChecksum: payloadChecksum,
      entityHash,
      importRunId,
      lastSyncedAt: now,
      updatedAt: now,
    },
  });
}

// ─── Utility ──────────────────────────────────────────────────────────────────

type ChannelType = "LOYVERSE" | "UBER_EATS" | "DOORDASH" | "ONLINE_ORDER" | "SUBSCRIPTION" | "OTHER";

function providerToChannelType(provider: string): ChannelType {
  switch (provider.toUpperCase()) {
    case "LOYVERSE": return "LOYVERSE";
    case "UBER_EATS": return "UBER_EATS";
    case "DOORDASH": return "DOORDASH";
    default: return "OTHER";
  }
}
