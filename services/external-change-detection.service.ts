/**
 * services/external-change-detection.service.ts
 *
 * Phase 5 — External Change Detection.
 *
 * Orchestrates comparison of successive external catalog import runs for the
 * same channel connection and logs field-level and structure-level diffs.
 *
 * Constraints:
 *   - External changes are DETECTED and LOGGED only.
 *   - Internal catalog is NEVER modified by this service.
 *   - No conflict resolution, no auto-merge, no two-way sync.
 *
 * TODO Phase 6:
 *   - detect conflicts between internal changes and external changes
 *   - field-level and structure-level conflict models
 *   - conflict status transitions and review workflow
 *
 * TODO Phase 7:
 *   - policy-based two-way sync
 *   - auto-merge rules
 *   - apply external changes into internal catalog only after explicit resolution/policy
 */

import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { compareCategoryFields } from "./external-change-detection/compare-category";
import { compareProductFields } from "./external-change-detection/compare-product";
import { compareModifierGroupFields } from "./external-change-detection/compare-modifier-group";
import { compareModifierOptionFields } from "./external-change-detection/compare-modifier-option";
import { compareCategoryLinks, compareModifierGroupLinks } from "./external-change-detection/compare-links";
import { buildExternalChangeSummary } from "./external-change-detection/summary";
import type {
  DetectExternalChangesInput,
  DetectExternalChangesResult,
  ListExternalChangesOptions,
  ExternalCatalogChangeDto,
  ExternalChangeSummary,
  CatalogEntityType,
  ExternalCatalogChangeStatus,
  ExternalCatalogChangeKind,
  ExternalChangeFieldChangeType,
} from "@/types/catalog-external-changes";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Top-level entry point: given an importRunId, find the previous successful
 * import for the same connection and compute all diffs.
 */
export async function detectExternalChangesForImportRun(
  input: DetectExternalChangesInput
): Promise<DetectExternalChangesResult> {
  const { importRunId } = input;

  // 1. Load the import run
  const importRun = await prisma.catalogImportRun.findUnique({ where: { id: importRunId } });
  if (!importRun) {
    return {
      importRunId,
      comparedImportRunId: null,
      created: 0,
      updated: 0,
      deleted: 0,
      structureUpdated: 0,
      unchanged: 0,
      diffStatus: "FAILED",
      errorMessage: "ImportRun not found",
    };
  }

  // Mark diff as RUNNING
  await prisma.catalogImportRun.update({
    where: { id: importRunId },
    data: { diffStatus: "RUNNING" },
  });

  try {
    const result = await detectExternalChangesForConnection(importRun.connectionId, importRunId);

    await prisma.catalogImportRun.update({
      where: { id: importRunId },
      data: {
        diffStatus: "SUCCEEDED",
        diffCompletedAt: new Date(),
        comparedToImportRunId: result.comparedImportRunId,
      },
    });

    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await prisma.catalogImportRun.update({
      where: { id: importRunId },
      data: { diffStatus: "FAILED", diffCompletedAt: new Date() },
    });

    return {
      importRunId,
      comparedImportRunId: null,
      created: 0,
      updated: 0,
      deleted: 0,
      structureUpdated: 0,
      unchanged: 0,
      diffStatus: "FAILED",
      errorMessage,
    };
  }
}

/**
 * Core diff computation for a connection + importRun.
 * Finds the previous SUCCEEDED run and compares normalized entity states.
 */
export async function detectExternalChangesForConnection(
  connectionId: string,
  importRunId: string
): Promise<DetectExternalChangesResult> {
  // Load current run
  const currentRun = await prisma.catalogImportRun.findUnique({ where: { id: importRunId } });
  if (!currentRun) throw new Error(`ImportRun ${importRunId} not found`);

  // Find previous SUCCEEDED run for same connection (excluding current)
  const previousRun = await prisma.catalogImportRun.findFirst({
    where: {
      connectionId,
      status: "SUCCEEDED",
      id: { not: importRunId },
      startedAt: { lt: currentRun.startedAt },
    },
    orderBy: { startedAt: "desc" },
  });

  if (!previousRun) {
    // No previous run — all entities in current run are CREATED
    return await handleFirstImport(connectionId, importRunId, currentRun.tenantId, currentRun.storeId);
  }

  const comparedImportRunId = previousRun.id;

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let structureUpdated = 0;
  let unchanged = 0;

  // ── Categories ──────────────────────────────────────────────────────────────
  const { created: cc, updated: cu, deleted: cd, unchanged: cuc } =
    await detectCategoryChanges(connectionId, importRunId, comparedImportRunId, currentRun.tenantId, currentRun.storeId);
  created += cc; updated += cu; deleted += cd; unchanged += cuc;

  // ── Products ────────────────────────────────────────────────────────────────
  const { created: pc, updated: pu, deleted: pd, unchanged: puc, structureUpdated: psu } =
    await detectProductChanges(connectionId, importRunId, comparedImportRunId, currentRun.tenantId, currentRun.storeId);
  created += pc; updated += pu; deleted += pd; unchanged += puc; structureUpdated += psu;

  // ── Modifier Groups ─────────────────────────────────────────────────────────
  const { created: mgc, updated: mgu, deleted: mgd, unchanged: mguc } =
    await detectModifierGroupChanges(connectionId, importRunId, comparedImportRunId, currentRun.tenantId, currentRun.storeId);
  created += mgc; updated += mgu; deleted += mgd; unchanged += mguc;

  // ── Modifier Options ────────────────────────────────────────────────────────
  const { created: moc, updated: mou, deleted: mod, unchanged: mouc } =
    await detectModifierOptionChanges(connectionId, importRunId, comparedImportRunId, currentRun.tenantId, currentRun.storeId);
  created += moc; updated += mou; deleted += mod; unchanged += mouc;

  return {
    importRunId,
    comparedImportRunId,
    created,
    updated,
    deleted,
    structureUpdated,
    unchanged,
    diffStatus: "SUCCEEDED",
  };
}

// ─── First-import case ────────────────────────────────────────────────────────

async function handleFirstImport(
  connectionId: string,
  importRunId: string,
  tenantId: string,
  storeId: string
): Promise<DetectExternalChangesResult> {
  const [cats, prods, mgs, mos] = await Promise.all([
    prisma.externalCatalogCategory.findMany({ where: { connectionId, importRunId } }),
    prisma.externalCatalogProduct.findMany({ where: { connectionId, importRunId } }),
    prisma.externalCatalogModifierGroup.findMany({ where: { connectionId, importRunId } }),
    prisma.externalCatalogModifierOption.findMany({ where: { connectionId, importRunId } }),
  ]);

  let created = 0;
  for (const cat of cats) {
    await createChangeLog({
      tenantId, storeId, connectionId,
      entityType: "CATEGORY",
      externalEntityId: cat.externalId,
      changeKind: "CREATED",
      importRunId,
      comparedImportRunId: null,
      currentEntityHash: cat.entityHash ?? undefined,
      summary: `New category "${cat.normalizedName ?? cat.externalId}" detected in first import`,
    });
    created++;
  }
  for (const prod of prods) {
    await createChangeLog({
      tenantId, storeId, connectionId,
      entityType: "PRODUCT",
      externalEntityId: prod.externalId,
      changeKind: "CREATED",
      importRunId,
      comparedImportRunId: null,
      currentEntityHash: prod.entityHash ?? undefined,
      summary: `New product "${prod.normalizedName ?? prod.externalId}" detected in first import`,
    });
    created++;
  }
  for (const mg of mgs) {
    await createChangeLog({
      tenantId, storeId, connectionId,
      entityType: "MODIFIER_GROUP",
      externalEntityId: mg.externalId,
      changeKind: "CREATED",
      importRunId,
      comparedImportRunId: null,
      currentEntityHash: mg.entityHash ?? undefined,
      summary: `New modifier group "${mg.normalizedName ?? mg.externalId}" detected in first import`,
    });
    created++;
  }
  for (const mo of mos) {
    await createChangeLog({
      tenantId, storeId, connectionId,
      entityType: "MODIFIER_OPTION",
      externalEntityId: mo.externalId,
      changeKind: "CREATED",
      importRunId,
      comparedImportRunId: null,
      currentEntityHash: mo.entityHash ?? undefined,
      summary: `New modifier option "${mo.normalizedName ?? mo.externalId}" detected in first import`,
    });
    created++;
  }

  return {
    importRunId,
    comparedImportRunId: null,
    created,
    updated: 0,
    deleted: 0,
    structureUpdated: 0,
    unchanged: 0,
    diffStatus: "SUCCEEDED",
  };
}

// ─── Per-entity-type detection ─────────────────────────────────────────────────

async function detectCategoryChanges(
  connectionId: string,
  importRunId: string,
  comparedImportRunId: string,
  tenantId: string,
  storeId: string
) {
  const [currRows, prevRows] = await Promise.all([
    prisma.externalCatalogCategory.findMany({ where: { connectionId, importRunId } }),
    prisma.externalCatalogCategory.findMany({ where: { connectionId, importRunId: comparedImportRunId } }),
  ]);

  const prevMap = new Map(prevRows.map((r) => [r.externalId, r]));
  const currMap = new Map(currRows.map((r) => [r.externalId, r]));

  let created = 0, updated = 0, deleted = 0, unchanged = 0;

  for (const curr of currRows) {
    const prev = prevMap.get(curr.externalId);
    if (!prev) {
      // CREATED
      await createChangeLog({
        tenantId, storeId, connectionId,
        entityType: "CATEGORY",
        externalEntityId: curr.externalId,
        changeKind: "CREATED",
        importRunId,
        comparedImportRunId,
        currentEntityHash: curr.entityHash ?? undefined,
        summary: `Category "${curr.normalizedName ?? curr.externalId}" appeared in this import`,
      });
      created++;
    } else if (curr.entityHash !== prev.entityHash) {
      // UPDATED
      const fieldDiffs = compareCategoryFields(
        { normalizedName: prev.normalizedName, rawPayload: prev.rawPayload as Record<string, unknown> },
        { normalizedName: curr.normalizedName, rawPayload: curr.rawPayload as Record<string, unknown> }
      );
      if (fieldDiffs.length > 0) {
        const changeId = await createChangeLog({
          tenantId, storeId, connectionId,
          entityType: "CATEGORY",
          externalEntityId: curr.externalId,
          changeKind: "UPDATED",
          importRunId,
          comparedImportRunId,
          previousEntityHash: prev.entityHash ?? undefined,
          currentEntityHash: curr.entityHash ?? undefined,
          summary: buildFieldSummary(fieldDiffs),
        });
        await createFieldDiffs(changeId, fieldDiffs);
        updated++;
      } else {
        unchanged++;
      }
    } else {
      unchanged++;
    }
  }

  for (const prev of prevRows) {
    if (!currMap.has(prev.externalId)) {
      await createChangeLog({
        tenantId, storeId, connectionId,
        entityType: "CATEGORY",
        externalEntityId: prev.externalId,
        changeKind: "DELETED",
        importRunId,
        comparedImportRunId,
        previousEntityHash: prev.entityHash ?? undefined,
        summary: `Category "${prev.normalizedName ?? prev.externalId}" missing from latest import`,
      });
      deleted++;
    }
  }

  return { created, updated, deleted, unchanged };
}

async function detectProductChanges(
  connectionId: string,
  importRunId: string,
  comparedImportRunId: string,
  tenantId: string,
  storeId: string
) {
  const [currRows, prevRows] = await Promise.all([
    prisma.externalCatalogProduct.findMany({ where: { connectionId, importRunId } }),
    prisma.externalCatalogProduct.findMany({ where: { connectionId, importRunId: comparedImportRunId } }),
  ]);

  // Link data for structure diffs
  const [currLinks, prevLinks] = await Promise.all([
    prisma.externalCatalogProductModifierGroupLink.findMany({ where: { connectionId, importRunId } }),
    prisma.externalCatalogProductModifierGroupLink.findMany({ where: { connectionId, importRunId: comparedImportRunId } }),
  ]);

  const prevMap = new Map(prevRows.map((r) => [r.externalId, r]));
  const currMap = new Map(currRows.map((r) => [r.externalId, r]));

  // Build link maps: productExternalId -> Set<modGroupId>
  const currLinkMap = new Map<string, string[]>();
  const prevLinkMap = new Map<string, string[]>();
  for (const l of currLinks) {
    if (!currLinkMap.has(l.externalProductId)) currLinkMap.set(l.externalProductId, []);
    currLinkMap.get(l.externalProductId)!.push(l.externalModifierGroupId);
  }
  for (const l of prevLinks) {
    if (!prevLinkMap.has(l.externalProductId)) prevLinkMap.set(l.externalProductId, []);
    prevLinkMap.get(l.externalProductId)!.push(l.externalModifierGroupId);
  }

  let created = 0, updated = 0, deleted = 0, unchanged = 0, structureUpdated = 0;

  for (const curr of currRows) {
    const prev = prevMap.get(curr.externalId);

    const currCatIds = curr.externalParentId ? [curr.externalParentId] : [];
    const prevCatIds = prev?.externalParentId ? [prev.externalParentId] : [];
    const currMgIds = currLinkMap.get(curr.externalId) ?? [];
    const prevMgIds = prev ? (prevLinkMap.get(prev.externalId) ?? []) : [];

    const catLinkDiffs = compareCategoryLinks(prevCatIds, currCatIds);
    const mgLinkDiffs = compareModifierGroupLinks(prevMgIds, currMgIds);
    const hasStructureChange = catLinkDiffs.length > 0 || mgLinkDiffs.length > 0;

    if (!prev) {
      const changeId = await createChangeLog({
        tenantId, storeId, connectionId,
        entityType: "PRODUCT",
        externalEntityId: curr.externalId,
        changeKind: "CREATED",
        importRunId,
        comparedImportRunId,
        currentEntityHash: curr.entityHash ?? undefined,
        summary: `Product "${curr.normalizedName ?? curr.externalId}" appeared in this import`,
      });
      if (hasStructureChange) {
        await createFieldDiffs(changeId, [...catLinkDiffs, ...mgLinkDiffs]);
      }
      created++;
    } else {
      const fieldDiffs = compareProductFields(
        { normalizedName: prev.normalizedName, normalizedPriceAmount: prev.normalizedPriceAmount, rawPayload: prev.rawPayload as Record<string, unknown> },
        { normalizedName: curr.normalizedName, normalizedPriceAmount: curr.normalizedPriceAmount, rawPayload: curr.rawPayload as Record<string, unknown> }
      );
      const allDiffs = [...fieldDiffs, ...catLinkDiffs, ...mgLinkDiffs];

      if (allDiffs.length === 0 && curr.entityHash === prev.entityHash) {
        unchanged++;
        continue;
      }

      let changeKind: "UPDATED" | "STRUCTURE_UPDATED" = "UPDATED";
      if (fieldDiffs.length === 0 && hasStructureChange) changeKind = "STRUCTURE_UPDATED";

      if (allDiffs.length > 0) {
        const changeId = await createChangeLog({
          tenantId, storeId, connectionId,
          entityType: "PRODUCT",
          externalEntityId: curr.externalId,
          changeKind,
          importRunId,
          comparedImportRunId,
          previousEntityHash: prev.entityHash ?? undefined,
          currentEntityHash: curr.entityHash ?? undefined,
          summary: buildFieldSummary(allDiffs),
        });
        await createFieldDiffs(changeId, allDiffs);
        if (changeKind === "STRUCTURE_UPDATED") structureUpdated++;
        else updated++;
      } else {
        unchanged++;
      }
    }
  }

  for (const prev of prevRows) {
    if (!currMap.has(prev.externalId)) {
      await createChangeLog({
        tenantId, storeId, connectionId,
        entityType: "PRODUCT",
        externalEntityId: prev.externalId,
        changeKind: "DELETED",
        importRunId,
        comparedImportRunId,
        previousEntityHash: prev.entityHash ?? undefined,
        summary: `Product "${prev.normalizedName ?? prev.externalId}" missing from latest import`,
      });
      deleted++;
    }
  }

  return { created, updated, deleted, unchanged, structureUpdated };
}

async function detectModifierGroupChanges(
  connectionId: string,
  importRunId: string,
  comparedImportRunId: string,
  tenantId: string,
  storeId: string
) {
  const [currRows, prevRows] = await Promise.all([
    prisma.externalCatalogModifierGroup.findMany({ where: { connectionId, importRunId } }),
    prisma.externalCatalogModifierGroup.findMany({ where: { connectionId, importRunId: comparedImportRunId } }),
  ]);

  const prevMap = new Map(prevRows.map((r) => [r.externalId, r]));
  const currMap = new Map(currRows.map((r) => [r.externalId, r]));

  let created = 0, updated = 0, deleted = 0, unchanged = 0;

  for (const curr of currRows) {
    const prev = prevMap.get(curr.externalId);
    if (!prev) {
      await createChangeLog({
        tenantId, storeId, connectionId,
        entityType: "MODIFIER_GROUP",
        externalEntityId: curr.externalId,
        changeKind: "CREATED",
        importRunId,
        comparedImportRunId,
        currentEntityHash: curr.entityHash ?? undefined,
        summary: `Modifier group "${curr.normalizedName ?? curr.externalId}" appeared in this import`,
      });
      created++;
    } else if (curr.entityHash !== prev.entityHash) {
      const fieldDiffs = compareModifierGroupFields(
        { normalizedName: prev.normalizedName, rawPayload: prev.rawPayload as Record<string, unknown> },
        { normalizedName: curr.normalizedName, rawPayload: curr.rawPayload as Record<string, unknown> }
      );
      if (fieldDiffs.length > 0) {
        const changeId = await createChangeLog({
          tenantId, storeId, connectionId,
          entityType: "MODIFIER_GROUP",
          externalEntityId: curr.externalId,
          changeKind: "UPDATED",
          importRunId,
          comparedImportRunId,
          previousEntityHash: prev.entityHash ?? undefined,
          currentEntityHash: curr.entityHash ?? undefined,
          summary: buildFieldSummary(fieldDiffs),
        });
        await createFieldDiffs(changeId, fieldDiffs);
        updated++;
      } else {
        unchanged++;
      }
    } else {
      unchanged++;
    }
  }

  for (const prev of prevRows) {
    if (!currMap.has(prev.externalId)) {
      await createChangeLog({
        tenantId, storeId, connectionId,
        entityType: "MODIFIER_GROUP",
        externalEntityId: prev.externalId,
        changeKind: "DELETED",
        importRunId,
        comparedImportRunId,
        previousEntityHash: prev.entityHash ?? undefined,
        summary: `Modifier group "${prev.normalizedName ?? prev.externalId}" missing from latest import`,
      });
      deleted++;
    }
  }

  return { created, updated, deleted, unchanged };
}

async function detectModifierOptionChanges(
  connectionId: string,
  importRunId: string,
  comparedImportRunId: string,
  tenantId: string,
  storeId: string
) {
  const [currRows, prevRows] = await Promise.all([
    prisma.externalCatalogModifierOption.findMany({ where: { connectionId, importRunId } }),
    prisma.externalCatalogModifierOption.findMany({ where: { connectionId, importRunId: comparedImportRunId } }),
  ]);

  const prevMap = new Map(prevRows.map((r) => [r.externalId, r]));
  const currMap = new Map(currRows.map((r) => [r.externalId, r]));

  let created = 0, updated = 0, deleted = 0, unchanged = 0;

  for (const curr of currRows) {
    const prev = prevMap.get(curr.externalId);
    if (!prev) {
      await createChangeLog({
        tenantId, storeId, connectionId,
        entityType: "MODIFIER_OPTION",
        externalEntityId: curr.externalId,
        changeKind: "CREATED",
        importRunId,
        comparedImportRunId,
        currentEntityHash: curr.entityHash ?? undefined,
        summary: `Modifier option "${curr.normalizedName ?? curr.externalId}" appeared in this import`,
      });
      created++;
    } else if (curr.entityHash !== prev.entityHash) {
      const fieldDiffs = compareModifierOptionFields(
        {
          normalizedName: prev.normalizedName,
          normalizedPriceAmount: prev.normalizedPriceAmount,
          externalParentId: prev.externalParentId,
          rawPayload: prev.rawPayload as Record<string, unknown>,
        },
        {
          normalizedName: curr.normalizedName,
          normalizedPriceAmount: curr.normalizedPriceAmount,
          externalParentId: curr.externalParentId,
          rawPayload: curr.rawPayload as Record<string, unknown>,
        }
      );

      // Detect parent group change → RELINKED
      const parentChanged = curr.externalParentId !== prev.externalParentId;
      const changeKind = parentChanged && fieldDiffs.length === 1 && fieldDiffs[0].fieldPath === "groupExternalId"
        ? "RELINKED"
        : "UPDATED";

      if (fieldDiffs.length > 0) {
        const changeId = await createChangeLog({
          tenantId, storeId, connectionId,
          entityType: "MODIFIER_OPTION",
          externalEntityId: curr.externalId,
          changeKind,
          importRunId,
          comparedImportRunId,
          previousEntityHash: prev.entityHash ?? undefined,
          currentEntityHash: curr.entityHash ?? undefined,
          summary: buildFieldSummary(fieldDiffs),
        });
        await createFieldDiffs(changeId, fieldDiffs);
        updated++;
      } else {
        unchanged++;
      }
    } else {
      unchanged++;
    }
  }

  for (const prev of prevRows) {
    if (!currMap.has(prev.externalId)) {
      await createChangeLog({
        tenantId, storeId, connectionId,
        entityType: "MODIFIER_OPTION",
        externalEntityId: prev.externalId,
        changeKind: "DELETED",
        importRunId,
        comparedImportRunId,
        previousEntityHash: prev.entityHash ?? undefined,
        summary: `Modifier option "${prev.normalizedName ?? prev.externalId}" missing from latest import`,
      });
      deleted++;
    }
  }

  return { created, updated, deleted, unchanged };
}

// ─── Change log creation helpers ─────────────────────────────────────────────

interface CreateChangeLogInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  entityType: CatalogEntityType;
  externalEntityId: string;
  changeKind: ExternalCatalogChangeKind;
  importRunId: string;
  comparedImportRunId: string | null;
  previousEntityHash?: string;
  currentEntityHash?: string;
  summary?: string;
}

async function createChangeLog(input: CreateChangeLogInput): Promise<string> {
  // Resolve mapping
  const mapping = await prisma.channelEntityMapping.findFirst({
    where: {
      connectionId: input.connectionId,
      externalEntityType: input.entityType,
      externalEntityId: input.externalEntityId,
      status: { in: ["ACTIVE", "NEEDS_REVIEW"] },
    },
    select: { id: true, internalEntityId: true },
  });

  // Supersede any existing OPEN changes for same entity
  await prisma.externalCatalogChange.updateMany({
    where: {
      connectionId: input.connectionId,
      entityType: input.entityType,
      externalEntityId: input.externalEntityId,
      status: "OPEN",
    },
    data: { status: "SUPERSEDED" },
  });

  const change = await prisma.externalCatalogChange.create({
    data: {
      tenantId: input.tenantId,
      storeId: input.storeId,
      connectionId: input.connectionId,
      entityType: input.entityType,
      externalEntityId: input.externalEntityId,
      internalEntityId: mapping?.internalEntityId ?? null,
      mappingId: mapping?.id ?? null,
      changeKind: input.changeKind,
      importRunId: input.importRunId,
      comparedImportRunId: input.comparedImportRunId,
      previousEntityHash: input.previousEntityHash ?? null,
      currentEntityHash: input.currentEntityHash ?? null,
      summary: input.summary ?? null,
    },
  });

  return change.id;
}

async function createFieldDiffs(
  changeId: string,
  diffs: Array<{
    fieldPath: string;
    previousValue: unknown;
    currentValue: unknown;
    changeType: string;
  }>
): Promise<void> {
  if (diffs.length === 0) return;

  await prisma.externalCatalogChangeField.createMany({
    data: diffs.map((d) => ({
      changeId,
      fieldPath: d.fieldPath,
      previousValue: d.previousValue !== undefined ? (d.previousValue as Prisma.InputJsonValue) : Prisma.JsonNull,
      currentValue: d.currentValue !== undefined ? (d.currentValue as Prisma.InputJsonValue) : Prisma.JsonNull,
      changeType: d.changeType,
    })),
  });
}

function buildFieldSummary(diffs: Array<{ fieldPath: string }>): string {
  return `Changed: ${diffs.map((d) => d.fieldPath).join(", ")}`;
}

// ─── List / Query ─────────────────────────────────────────────────────────────

export async function listExternalChanges(opts: ListExternalChangesOptions): Promise<ExternalCatalogChangeDto[]> {
  const rows = await prisma.externalCatalogChange.findMany({
    where: {
      connectionId: opts.connectionId,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.entityType ? { entityType: opts.entityType } : {}),
      ...(opts.changeKind ? { changeKind: opts.changeKind } : {}),
      ...(opts.mappedOnly ? { internalEntityId: { not: null } } : {}),
    },
    include: { fieldDiffs: true },
    orderBy: { detectedAt: "desc" },
    take: opts.limit ?? 50,
    skip: opts.offset ?? 0,
  });

  return rows.map(toDto);
}

export async function getExternalChange(changeId: string): Promise<ExternalCatalogChangeDto | null> {
  const row = await prisma.externalCatalogChange.findUnique({
    where: { id: changeId },
    include: { fieldDiffs: true },
  });
  return row ? toDto(row) : null;
}

export async function getExternalChangeSummary(connectionId: string): Promise<ExternalChangeSummary> {
  return buildExternalChangeSummary(connectionId);
}

// ─── Status actions ────────────────────────────────────────────────────────────

export async function acknowledgeExternalChange(changeId: string): Promise<ExternalCatalogChangeDto | null> {
  const updated = await prisma.externalCatalogChange.update({
    where: { id: changeId },
    data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
    include: { fieldDiffs: true },
  });
  return toDto(updated);
}

export async function ignoreExternalChange(changeId: string): Promise<ExternalCatalogChangeDto | null> {
  const updated = await prisma.externalCatalogChange.update({
    where: { id: changeId },
    data: { status: "IGNORED", ignoredAt: new Date() },
    include: { fieldDiffs: true },
  });
  return toDto(updated);
}

// ─── Serialization ─────────────────────────────────────────────────────────────

function toDto(row: {
  id: string;
  tenantId: string;
  storeId: string;
  connectionId: string;
  entityType: string;
  externalEntityId: string;
  internalEntityId: string | null;
  mappingId: string | null;
  changeKind: string;
  status: string;
  previousEntityHash: string | null;
  currentEntityHash: string | null;
  importRunId: string;
  comparedImportRunId: string | null;
  summary: string | null;
  detectedAt: Date;
  acknowledgedAt: Date | null;
  ignoredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  fieldDiffs?: Array<{
    id: string;
    changeId: string;
    fieldPath: string;
    previousValue: unknown;
    currentValue: unknown;
    changeType: string;
    createdAt: Date;
  }>;
}): ExternalCatalogChangeDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    storeId: row.storeId,
    connectionId: row.connectionId,
    entityType: row.entityType as CatalogEntityType,
    externalEntityId: row.externalEntityId,
    internalEntityId: row.internalEntityId,
    mappingId: row.mappingId,
    changeKind: row.changeKind as ExternalCatalogChangeDto["changeKind"],
    status: row.status as ExternalCatalogChangeStatus,
    previousEntityHash: row.previousEntityHash,
    currentEntityHash: row.currentEntityHash,
    importRunId: row.importRunId,
    comparedImportRunId: row.comparedImportRunId,
    summary: row.summary,
    detectedAt: row.detectedAt.toISOString(),
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    ignoredAt: row.ignoredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    fieldDiffs: row.fieldDiffs?.map((f) => ({
      id: f.id,
      changeId: f.changeId,
      fieldPath: f.fieldPath,
      previousValue: f.previousValue,
      currentValue: f.currentValue,
      changeType: f.changeType as ExternalChangeFieldChangeType,
      createdAt: f.createdAt.toISOString(),
    })),
  };
}
