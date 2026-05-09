import { type ConnectionProvider, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptJson } from "@/lib/integrations/crypto";
import { runFullCatalogImport } from "@/services/catalog-import.service";
import type { DecryptedCredentialPayload } from "@/domains/integration/types";
import { getProviderCapabilities } from "@/domains/integration/provider-capabilities";

export type MenuImportAction = "CREATE" | "UPDATE" | "SKIP_UNCHANGED" | "SKIP_OWNER_CHANGED";

export interface MenuImportPreviewItem {
  externalProductId: string;
  externalHash: string | null;
  externalName: string;
  externalDescription: string | null;
  externalPriceMillicents: number;
  action: MenuImportAction;
  reason: string;
  shouldApply: boolean;
  mappedTenantProductId: string | null;
  mappedTenantProductName: string | null;
}

export interface MenuImportPreviewSummary {
  total: number;
  create: number;
  update: number;
  skipUnchanged: number;
  skipOwnerChanged: number;
  importRunId: string;
}

export interface MenuImportPreviewResult {
  runId: string;
  connectionId: string;
  provider: string;
  overwriteExisting: boolean;
  summary: MenuImportPreviewSummary;
  items: MenuImportPreviewItem[];
  createdAt: string;
}

export interface MenuImportApplyResult {
  runId: string;
  appliedCreates: number;
  appliedUpdates: number;
  skipped: number;
  failed: number;
  tenantProductIds: string[];
  errors: Array<{ externalProductId: string; message: string }>;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function maybeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function maybeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dollarToMillicents(value: number): number {
  return Math.round(value * 100_000);
}

function getNormalizedExternalProduct(provider: string, rawPayload: unknown, fallbackPriceAmount: number | null): {
  name: string;
  description: string | null;
  priceMillicents: number;
  isActive: boolean;
} {
  const raw = asRecord(rawPayload);
  const upperProvider = provider.toUpperCase();

  if (upperProvider === "LOYVERSE") {
    const variants = Array.isArray(raw["variants"]) ? (raw["variants"] as unknown[]) : [];
    const firstVariant = asRecord(variants[0]);
    const priceFromVariant = maybeNumber(firstVariant["price"]);
    const priceFromRaw = maybeNumber(raw["price"]);
    const isActive = typeof raw["is_active"] === "boolean" ? (raw["is_active"] as boolean) : true;

    return {
      name:
        maybeString(raw["item_name"]) ??
        maybeString(raw["name"]) ??
        "Unnamed Product",
      description: maybeString(raw["description"]),
      priceMillicents:
        priceFromVariant !== null
          ? dollarToMillicents(priceFromVariant)
          : priceFromRaw !== null
          ? dollarToMillicents(priceFromRaw)
          : fallbackPriceAmount ?? 0,
      isActive,
    };
  }

  if (upperProvider === "LIGHTSPEED") {
    const isActive = typeof raw["active"] === "boolean" ? (raw["active"] as boolean) : true;
    const majorPrice = maybeNumber(raw["price"]);

    return {
      name: maybeString(raw["name"]) ?? "Unnamed Product",
      description:
        maybeString(raw["description"]) ??
        maybeString(raw["short_description"]),
      priceMillicents:
        fallbackPriceAmount !== null
          ? fallbackPriceAmount * 1000
          : majorPrice !== null
          ? dollarToMillicents(majorPrice)
          : 0,
      isActive,
    };
  }

  return {
    name: maybeString(raw["name"]) ?? "Unnamed Product",
    description: maybeString(raw["description"]),
    priceMillicents: (fallbackPriceAmount ?? 0) * 1000,
    isActive: true,
  };
}

function toPreviewResult(row: {
  id: string;
  connectionId: string;
  provider: string;
  overwriteExisting: boolean;
  summaryJson: unknown;
  createdAt: Date;
}): MenuImportPreviewResult {
  const summaryPayload = asRecord(row.summaryJson);
  const summary = asRecord(summaryPayload["summary"]);
  const itemsRaw = Array.isArray(summaryPayload["items"]) ? summaryPayload["items"] : [];

  const items: MenuImportPreviewItem[] = itemsRaw.map((item) => {
    const r = asRecord(item);
    return {
      externalProductId: maybeString(r["externalProductId"]) ?? "",
      externalHash: maybeString(r["externalHash"]),
      externalName: maybeString(r["externalName"]) ?? "Unnamed Product",
      externalDescription: maybeString(r["externalDescription"]),
      externalPriceMillicents: maybeNumber(r["externalPriceMillicents"]) ?? 0,
      action: (maybeString(r["action"]) as MenuImportAction) ?? "SKIP_UNCHANGED",
      reason: maybeString(r["reason"]) ?? "",
      shouldApply: Boolean(r["shouldApply"]),
      mappedTenantProductId: maybeString(r["mappedTenantProductId"]),
      mappedTenantProductName: maybeString(r["mappedTenantProductName"]),
    };
  });

  return {
    runId: row.id,
    connectionId: row.connectionId,
    provider: row.provider,
    overwriteExisting: row.overwriteExisting,
    summary: {
      total: maybeNumber(summary["total"]) ?? 0,
      create: maybeNumber(summary["create"]) ?? 0,
      update: maybeNumber(summary["update"]) ?? 0,
      skipUnchanged: maybeNumber(summary["skipUnchanged"]) ?? 0,
      skipOwnerChanged: maybeNumber(summary["skipOwnerChanged"]) ?? 0,
      importRunId: maybeString(summary["importRunId"]) ?? "",
    },
    items,
    createdAt: row.createdAt.toISOString(),
  };
}

async function resolveConnectionForMenuImport(tenantId: string, connectionId: string) {
  const connection = await prisma.connection.findFirst({
    where: { id: connectionId, tenantId },
    include: {
      credentials: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!connection) {
    throw new Error("Connection not found");
  }

  if (connection.status !== "CONNECTED") {
    throw new Error("Connection must be CONNECTED before menu import");
  }

  const providerCapabilities = getProviderCapabilities(connection.provider);
  if (!providerCapabilities.supportsMenuImport) {
    throw new Error(`${connection.provider} does not support menu import`);
  }

  const credential = connection.credentials[0];
  if (!credential) {
    throw new Error("No active credential for connection");
  }

  const decrypted = decryptJson<DecryptedCredentialPayload>(credential.configEncrypted);

  const credentials: Record<string, string> = {
    accessToken: decrypted.accessToken ?? "",
    refreshToken: decrypted.refreshToken ?? "",
    externalStoreId: connection.externalStoreId ?? "",
    businessUnitId: connection.externalStoreId ?? "",
  };

  return { connection, credentials };
}

export async function createOwnerMenuImportPreview(input: {
  tenantId: string;
  connectionId: string;
  overwriteExisting?: boolean;
  actorUserId: string;
}): Promise<MenuImportPreviewResult> {
  const overwriteExisting = Boolean(input.overwriteExisting);
  const { connection, credentials } = await resolveConnectionForMenuImport(input.tenantId, input.connectionId);

  const importResult = await runFullCatalogImport({
    tenantId: connection.tenantId,
    storeId: connection.storeId,
    connectionId: connection.id,
    provider: connection.provider,
    credentials,
  });

  if (importResult.status !== "SUCCEEDED") {
    throw new Error(importResult.errorMessage ?? "Catalog import failed");
  }

  const [externalProducts, maps] = await Promise.all([
    prisma.externalCatalogProduct.findMany({
      where: { connectionId: connection.id, storeId: connection.storeId },
      orderBy: [{ normalizedName: "asc" }, { externalId: "asc" }],
      select: {
        externalId: true,
        normalizedName: true,
        normalizedPriceAmount: true,
        entityHash: true,
        rawPayload: true,
      },
    }),
    prisma.menuImportProductMap.findMany({
      where: { connectionId: connection.id, tenantId: connection.tenantId },
      include: {
        tenantProduct: {
          select: {
            id: true,
            name: true,
            basePriceAmount: true,
            deletedAt: true,
          },
        },
      },
    }),
  ]);

  const mapByExternalId = new Map(maps.map((m) => [m.externalProductId, m]));

  let create = 0;
  let update = 0;
  let skipUnchanged = 0;
  let skipOwnerChanged = 0;

  const items: MenuImportPreviewItem[] = externalProducts.map((externalProduct) => {
    const normalized = getNormalizedExternalProduct(
      connection.provider,
      externalProduct.rawPayload,
      externalProduct.normalizedPriceAmount
    );
    const mapped = mapByExternalId.get(externalProduct.externalId);

    if (!mapped || mapped.tenantProduct.deletedAt) {
      create += 1;
      return {
        externalProductId: externalProduct.externalId,
        externalHash: externalProduct.entityHash,
        externalName: normalized.name,
        externalDescription: normalized.description,
        externalPriceMillicents: normalized.priceMillicents,
        action: "CREATE",
        reason: mapped ? "Mapped product was deleted; a new tenant product will be created." : "No existing mapping; a new tenant product will be created.",
        shouldApply: true,
        mappedTenantProductId: null,
        mappedTenantProductName: null,
      };
    }

    const ownerChanged =
      (mapped.lastImportedName !== null && mapped.tenantProduct.name !== mapped.lastImportedName) ||
      (mapped.lastImportedPriceMillicents !== null && mapped.tenantProduct.basePriceAmount !== mapped.lastImportedPriceMillicents);

    const hasExternalChange =
      mapped.lastExternalHash !== externalProduct.entityHash ||
      mapped.lastImportedName !== normalized.name ||
      mapped.lastImportedPriceMillicents !== normalized.priceMillicents;

    if (!hasExternalChange) {
      skipUnchanged += 1;
      return {
        externalProductId: externalProduct.externalId,
        externalHash: externalProduct.entityHash,
        externalName: normalized.name,
        externalDescription: normalized.description,
        externalPriceMillicents: normalized.priceMillicents,
        action: "SKIP_UNCHANGED",
        reason: "No external change since last import.",
        shouldApply: false,
        mappedTenantProductId: mapped.tenantProductId,
        mappedTenantProductName: mapped.tenantProduct.name,
      };
    }

    if (ownerChanged && !overwriteExisting) {
      skipOwnerChanged += 1;
      return {
        externalProductId: externalProduct.externalId,
        externalHash: externalProduct.entityHash,
        externalName: normalized.name,
        externalDescription: normalized.description,
        externalPriceMillicents: normalized.priceMillicents,
        action: "SKIP_OWNER_CHANGED",
        reason: "Owner edited this product after previous import. Re-run with overwrite enabled to force update.",
        shouldApply: false,
        mappedTenantProductId: mapped.tenantProductId,
        mappedTenantProductName: mapped.tenantProduct.name,
      };
    }

    update += 1;
    return {
      externalProductId: externalProduct.externalId,
      externalHash: externalProduct.entityHash,
      externalName: normalized.name,
      externalDescription: normalized.description,
      externalPriceMillicents: normalized.priceMillicents,
      action: "UPDATE",
      reason: ownerChanged ? "Owner change overwrite is enabled." : "Mapped product will be updated from external source.",
      shouldApply: true,
      mappedTenantProductId: mapped.tenantProductId,
      mappedTenantProductName: mapped.tenantProduct.name,
    };
  });

  const summary: MenuImportPreviewSummary = {
    total: items.length,
    create,
    update,
    skipUnchanged,
    skipOwnerChanged,
    importRunId: importResult.importRunId,
  };

  const run = await prisma.menuImportRun.create({
    data: {
      tenantId: connection.tenantId,
      storeId: connection.storeId,
      connectionId: connection.id,
      provider: connection.provider,
      status: "PREVIEWED",
      overwriteExisting,
      externalImportRunId: importResult.importRunId,
      summaryJson: {
        summary,
        items,
      } as unknown as Prisma.InputJsonValue,
      createdByUserId: input.actorUserId,
    },
    select: {
      id: true,
      connectionId: true,
      provider: true,
      overwriteExisting: true,
      summaryJson: true,
      createdAt: true,
    },
  });

  return toPreviewResult(run);
}

export async function getOwnerMenuImportRun(input: {
  tenantId: string;
  connectionId: string;
  runId: string;
}): Promise<MenuImportPreviewResult> {
  const run = await prisma.menuImportRun.findFirst({
    where: {
      id: input.runId,
      tenantId: input.tenantId,
      connectionId: input.connectionId,
    },
    select: {
      id: true,
      connectionId: true,
      provider: true,
      overwriteExisting: true,
      summaryJson: true,
      createdAt: true,
    },
  });

  if (!run) {
    throw new Error("Menu import run not found");
  }

  return toPreviewResult(run);
}

export async function listOwnerMenuImportRuns(input: {
  tenantId: string;
  connectionId: string;
  limit?: number;
}): Promise<MenuImportPreviewResult[]> {
  const rows = await prisma.menuImportRun.findMany({
    where: {
      tenantId: input.tenantId,
      connectionId: input.connectionId,
    },
    orderBy: { createdAt: "desc" },
    take: input.limit ?? 10,
    select: {
      id: true,
      connectionId: true,
      provider: true,
      overwriteExisting: true,
      summaryJson: true,
      createdAt: true,
    },
  });

  return rows.map(toPreviewResult);
}

export async function applyOwnerMenuImportRun(input: {
  tenantId: string;
  connectionId: string;
  runId: string;
  actorUserId: string;
}): Promise<MenuImportApplyResult> {
  const run = await prisma.menuImportRun.findFirst({
    where: {
      id: input.runId,
      tenantId: input.tenantId,
      connectionId: input.connectionId,
    },
    select: {
      id: true,
      tenantId: true,
      storeId: true,
      connectionId: true,
      provider: true,
      status: true,
      summaryJson: true,
      overwriteExisting: true,
    },
  });

  if (!run) throw new Error("Menu import run not found");

  const payload = asRecord(run.summaryJson);
  const itemsRaw = Array.isArray(payload["items"]) ? payload["items"] : [];
  const items = itemsRaw
    .map((x) => asRecord(x))
    .filter((x) => Boolean(x["shouldApply"]))
    .map((x) => ({
      externalProductId: maybeString(x["externalProductId"]) ?? "",
      externalHash: maybeString(x["externalHash"]),
      externalName: maybeString(x["externalName"]) ?? "Unnamed Product",
      externalDescription: maybeString(x["externalDescription"]),
      externalPriceMillicents: maybeNumber(x["externalPriceMillicents"]) ?? 0,
      action: (maybeString(x["action"]) as MenuImportAction) ?? "SKIP_UNCHANGED",
      mappedTenantProductId: maybeString(x["mappedTenantProductId"]),
    }))
    .filter((x) => x.externalProductId.length > 0);

  // ── A. Import categories ────────────────────────────────────────────────────
  // Fetch all external categories for this connection and upsert into the
  // internal TenantProductCategory table.  Parallelise upserts since each
  // uses a unique key and is independent.  Build a map from external category
  // ID to internal category ID so we can set categoryId on products.

  const externalCategories = await prisma.externalCatalogCategory.findMany({
    where: { connectionId: run.connectionId },
    select: { externalId: true, normalizedName: true },
  });

  const categoriesWithName = externalCategories.filter((c) => c.normalizedName != null);
  const upsertedCategories = await Promise.all(
    categoriesWithName.map((exCat) =>
      prisma.tenantProductCategory
        .upsert({
          where: { tenantId_name: { tenantId: run.tenantId, name: exCat.normalizedName! } },
          create: { tenantId: run.tenantId, name: exCat.normalizedName! },
          update: {},
          select: { id: true },
        })
        .then((cat) => ({ externalId: exCat.externalId, internalId: cat.id }))
    )
  );
  const catIdMap = new Map(upsertedCategories.map((c) => [c.externalId, c.internalId]));

  // ── B. Import modifier groups ────────────────────────────────────────────────
  // Fetch all external modifier groups for this connection. Load existing
  // TenantModifierGroup records in a single query, then batch-create the
  // missing ones to avoid N+1 round-trips.

  const externalModifierGroups = await prisma.externalCatalogModifierGroup.findMany({
    where: { connectionId: run.connectionId },
    select: { externalId: true, normalizedName: true },
  });

  const mgIdMap = new Map<string, string>();

  if (externalModifierGroups.length > 0) {
    const mgNames = externalModifierGroups
      .map((g) => g.normalizedName)
      .filter((n): n is string => n != null);

    const existingMgs = await prisma.tenantModifierGroup.findMany({
      where: { tenantId: run.tenantId, deletedAt: null, name: { in: mgNames } },
      select: { id: true, name: true },
    });
    const existingMgByName = new Map(existingMgs.map((g) => [g.name, g.id]));

    // Batch-create any modifier groups that don't exist yet, then re-fetch their IDs.
    const newMgNames = externalModifierGroups
      .map((g) => g.normalizedName)
      .filter((n): n is string => n != null && !existingMgByName.has(n));

    if (newMgNames.length > 0) {
      await prisma.tenantModifierGroup.createMany({
        data: newMgNames.map((name) => ({
          tenantId: run.tenantId,
          name,
          selectionMin: 0,
          isRequired: false,
          isActive: true,
        })),
        skipDuplicates: true,
      });

      const newlyCreated = await prisma.tenantModifierGroup.findMany({
        where: { tenantId: run.tenantId, deletedAt: null, name: { in: newMgNames } },
        select: { id: true, name: true },
      });
      for (const g of newlyCreated) {
        existingMgByName.set(g.name, g.id);
      }
    }

    for (const exMg of externalModifierGroups) {
      if (!exMg.normalizedName) continue;
      const mgId = existingMgByName.get(exMg.normalizedName);
      if (mgId) mgIdMap.set(exMg.externalId, mgId);
    }
  }

  // ── C. Import modifier options ────────────────────────────────────────────────
  // Load existing options for all affected modifier groups in one query,
  // then batch-create any options that are not already present.

  const externalModifierOptions = await prisma.externalCatalogModifierOption.findMany({
    where: { connectionId: run.connectionId },
    select: { externalId: true, normalizedName: true, externalParentId: true, rawPayload: true },
  });

  if (externalModifierOptions.length > 0 && mgIdMap.size > 0) {
    const internalMgIds = Array.from(mgIdMap.values());
    const existingOptions = await prisma.tenantModifierOption.findMany({
      where: { tenantModifierGroupId: { in: internalMgIds }, deletedAt: null },
      select: { tenantModifierGroupId: true, name: true },
    });
    const existingOptionKeys = new Set(
      existingOptions.map((o) => `${o.tenantModifierGroupId}::${o.name}`)
    );

    const optionsToCreate = externalModifierOptions.flatMap((exMo) => {
      if (!exMo.normalizedName || !exMo.externalParentId) return [];
      const tenantModifierGroupId = mgIdMap.get(exMo.externalParentId);
      if (!tenantModifierGroupId) return [];
      if (existingOptionKeys.has(`${tenantModifierGroupId}::${exMo.normalizedName}`)) return [];

      const rawMo = asRecord(exMo.rawPayload);
      const priceRaw = maybeNumber(rawMo["price"]);
      const priceDeltaAmount = priceRaw !== null ? dollarToMillicents(priceRaw) : 0;

      return [
        {
          tenantId: run.tenantId,
          tenantModifierGroupId,
          name: exMo.normalizedName,
          priceDeltaAmount,
          isActive: true,
        },
      ];
    });

    if (optionsToCreate.length > 0) {
      await prisma.tenantModifierOption.createMany({ data: optionsToCreate });
    }
  }

  // ── D. Resolve external product → category mapping ───────────────────────────
  // For the products that will be imported, look up their externalParentId
  // (category external ID) from the external catalog.

  const importedExternalProductIds = items.map((x) => x.externalProductId);
  const externalProductCatData =
    importedExternalProductIds.length > 0
      ? await prisma.externalCatalogProduct.findMany({
          where: { connectionId: run.connectionId, externalId: { in: importedExternalProductIds } },
          select: { externalId: true, externalParentId: true },
        })
      : [];

  const externalProductCatMap = new Map(
    externalProductCatData
      .filter((p) => p.externalParentId != null)
      .map((p) => [p.externalId, p.externalParentId!])
  );

  let appliedCreates = 0;
  let appliedUpdates = 0;
  let skipped = 0;
  let failed = 0;
  const tenantProductIds = new Set<string>();
  const errors: Array<{ externalProductId: string; message: string }> = [];

  // Map from externalProductId → tenantProductId (built during the product loop,
  // used afterwards to create product–modifier-group links).
  const externalToTenantProductId = new Map<string, string>();

  for (const item of items) {
    try {
      const exCatId = externalProductCatMap.get(item.externalProductId);
      const categoryId = exCatId ? (catIdMap.get(exCatId) ?? null) : null;

      if (item.action === "CREATE" || !item.mappedTenantProductId) {
        const created = await prisma.tenantCatalogProduct.create({
          data: {
            tenantId: run.tenantId,
            name: item.externalName,
            description: item.externalDescription,
            shortDescription: item.externalDescription?.slice(0, 120) ?? null,
            basePriceAmount: item.externalPriceMillicents,
            categoryId: categoryId ?? undefined,
            isActive: true,
          },
          select: { id: true, name: true, basePriceAmount: true },
        });

        await prisma.menuImportProductMap.upsert({
          where: {
            connectionId_externalProductId: {
              connectionId: run.connectionId,
              externalProductId: item.externalProductId,
            },
          },
          create: {
            tenantId: run.tenantId,
            storeId: run.storeId,
            connectionId: run.connectionId,
            externalProductId: item.externalProductId,
            tenantProductId: created.id,
            lastImportedName: item.externalName,
            lastImportedPriceMillicents: item.externalPriceMillicents,
            lastExternalHash: item.externalHash,
          },
          update: {
            tenantProductId: created.id,
            lastImportedName: item.externalName,
            lastImportedPriceMillicents: item.externalPriceMillicents,
            lastExternalHash: item.externalHash,
          },
        });

        appliedCreates += 1;
        tenantProductIds.add(created.id);
        externalToTenantProductId.set(item.externalProductId, created.id);
      } else if (item.action === "UPDATE") {
        const updated = await prisma.tenantCatalogProduct.update({
          where: { id: item.mappedTenantProductId },
          data: {
            name: item.externalName,
            description: run.overwriteExisting ? item.externalDescription : undefined,
            shortDescription: run.overwriteExisting
              ? item.externalDescription?.slice(0, 120) ?? null
              : undefined,
            basePriceAmount: item.externalPriceMillicents,
            categoryId: categoryId ?? undefined,
          },
          select: { id: true },
        });

        await prisma.menuImportProductMap.update({
          where: {
            connectionId_externalProductId: {
              connectionId: run.connectionId,
              externalProductId: item.externalProductId,
            },
          },
          data: {
            lastImportedName: item.externalName,
            lastImportedPriceMillicents: item.externalPriceMillicents,
            lastExternalHash: item.externalHash,
          },
        });

        appliedUpdates += 1;
        tenantProductIds.add(updated.id);
        externalToTenantProductId.set(item.externalProductId, updated.id);
      } else {
        skipped += 1;
      }
    } catch (err) {
      failed += 1;
      errors.push({
        externalProductId: item.externalProductId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── E. Create product–modifier-group links ────────────────────────────────────
  // For each imported product, look up its modifier-group links in the external
  // catalog and upsert TenantProductModifierGroup rows.

  if (externalToTenantProductId.size > 0) {
    const productModifierLinks = await prisma.externalCatalogProductModifierGroupLink.findMany({
      where: {
        connectionId: run.connectionId,
        externalProductId: { in: Array.from(externalToTenantProductId.keys()) },
      },
      select: { externalProductId: true, externalModifierGroupId: true },
    });

    const linksToCreate = productModifierLinks.flatMap((link) => {
      const tenantProductId = externalToTenantProductId.get(link.externalProductId);
      const tenantModifierGroupId = mgIdMap.get(link.externalModifierGroupId);
      if (!tenantProductId || !tenantModifierGroupId) return [];
      return [{ tenantId: run.tenantId, tenantProductId, tenantModifierGroupId }];
    });

    if (linksToCreate.length > 0) {
      await prisma.tenantProductModifierGroup.createMany({
        data: linksToCreate,
        skipDuplicates: true,
      });
    }
  }

  const applyResult: MenuImportApplyResult = {
    runId: run.id,
    appliedCreates,
    appliedUpdates,
    skipped,
    failed,
    tenantProductIds: Array.from(tenantProductIds),
    errors,
  };

  await prisma.menuImportRun.update({
    where: { id: run.id },
    data: {
      status: failed > 0 ? "FAILED" : "APPLIED",
      appliedAt: new Date(),
      applyResultJson: applyResult as unknown as Prisma.InputJsonValue,
    },
  });

  return applyResult;
}
