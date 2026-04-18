/**
 * services/catalog-merge/plan-generator.ts
 *
 * Generates a CatalogSyncPlan from a validated CatalogMergeDraft.
 *
 * Flow:
 *   1. Load draft (must be VALIDATED)
 *   2. Resolve all field/structure values
 *   3. Create CatalogSyncPlan + CatalogSyncPlanItems based on applyTarget
 *   4. Update draft.generatedPlanId + status = PLAN_GENERATED
 *   5. Create CatalogMergeExecutionLog entry
 */

import { prisma } from "@/lib/prisma";
import { resolveFieldValue, resolveStructureValue } from "./resolve-values";
import type { CatalogEntityType } from "@/types/catalog-external-changes";
import type { CatalogSyncAction } from "@/types/catalog-sync";

export async function generateSyncPlanFromMergeDraft(
  draftId: string,
  userId?: string
): Promise<string> {
  const draft = await prisma.catalogMergeDraft.findUnique({
    where: { id: draftId },
    include: {
      fieldChoices: true,
      structureChoices: true,
    },
  });

  if (!draft) {
    throw new Error(`MergeDraft ${draftId} not found`);
  }

  if (draft.status !== "VALIDATED") {
    throw new Error(
      `MergeDraft must be in VALIDATED status to generate a plan. Current status: ${draft.status}`
    );
  }

  const { tenantId, storeId, connectionId, internalEntityType, internalEntityId,
          externalEntityType, externalEntityId, applyTarget, conflictId } = draft;

  // Resolve all field values
  const resolvedFields = draft.fieldChoices.map((f) => ({
    fieldPath: f.fieldPath,
    choice: f.choice,
    resolvedValue: resolveFieldValue({
      choice: f.choice as "TAKE_INTERNAL" | "TAKE_EXTERNAL" | "CUSTOM_VALUE",
      internalValue: f.internalValue,
      externalValue: f.externalValue,
      customValue: f.customValue,
    }),
  }));

  // Resolve all structure values
  const resolvedStructures = draft.structureChoices.map((s) => ({
    fieldPath: s.fieldPath,
    choice: s.choice,
    resolvedValue: resolveStructureValue({
      choice: s.choice,
      internalValue: s.internalValue,
      externalValue: s.externalValue,
      customValue: s.customValue,
    }),
  }));

  // Determine which actions to create based on applyTarget
  const actions: CatalogSyncAction[] = [];
  if (applyTarget === "INTERNAL_ONLY") {
    actions.push("APPLY_INTERNAL_PATCH");
  } else if (applyTarget === "EXTERNAL_ONLY") {
    actions.push("APPLY_EXTERNAL_PATCH");
  } else {
    // INTERNAL_THEN_EXTERNAL
    actions.push("APPLY_INTERNAL_PATCH", "APPLY_EXTERNAL_PATCH");
  }

  // Build plan items
  type PlanItemData = {
    internalEntityType: string | null;
    internalEntityId: string | null;
    externalEntityType: string | null;
    externalEntityId: string | null;
    scope: string;
    fieldPath: string | null;
    action: string;
    direction: string | null;
    status: string;
    blockedReason: string | null;
    previewBeforeValue: unknown;
    previewAfterValue: unknown;
    conflictId: string | null;
  };

  const planItems: PlanItemData[] = [];

  for (const action of actions) {
    // One item per resolved field
    for (const rf of resolvedFields) {
      planItems.push({
        internalEntityType: internalEntityType as string,
        internalEntityId,
        externalEntityType: (externalEntityType as string) ?? null,
        externalEntityId: externalEntityId ?? null,
        scope: internalEntityType as string,
        fieldPath: rf.fieldPath,
        action,
        direction: action === "APPLY_INTERNAL_PATCH" ? "EXTERNAL_TO_INTERNAL" : "INTERNAL_TO_EXTERNAL",
        status: "READY",
        blockedReason: null,
        previewBeforeValue: null,
        previewAfterValue: rf.resolvedValue,
        conflictId: conflictId ?? null,
      });
    }

    // One item per resolved structure
    for (const rs of resolvedStructures) {
      planItems.push({
        internalEntityType: internalEntityType as string,
        internalEntityId,
        externalEntityType: (externalEntityType as string) ?? null,
        externalEntityId: externalEntityId ?? null,
        scope: rs.fieldPath.toUpperCase().replace("_", "_"),
        fieldPath: rs.fieldPath,
        action,
        direction: action === "APPLY_INTERNAL_PATCH" ? "EXTERNAL_TO_INTERNAL" : "INTERNAL_TO_EXTERNAL",
        status: "READY",
        blockedReason: null,
        previewBeforeValue: null,
        previewAfterValue: rs.resolvedValue,
        conflictId: conflictId ?? null,
      });
    }

    // If no field/structure choices, add a single entity-level item
    if (resolvedFields.length === 0 && resolvedStructures.length === 0) {
      planItems.push({
        internalEntityType: internalEntityType as string,
        internalEntityId,
        externalEntityType: (externalEntityType as string) ?? null,
        externalEntityId: externalEntityId ?? null,
        scope: internalEntityType as string,
        fieldPath: null,
        action,
        direction: action === "APPLY_INTERNAL_PATCH" ? "EXTERNAL_TO_INTERNAL" : "INTERNAL_TO_EXTERNAL",
        status: "READY",
        blockedReason: null,
        previewBeforeValue: null,
        previewAfterValue: null,
        conflictId: conflictId ?? null,
      });
    }
  }

  // Create the plan + items in a transaction
  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.catalogSyncPlan.create({
      data: {
        tenantId,
        storeId,
        connectionId,
        source: "MERGE_DRAFT",
        status: "READY",
        basedOnConflictId: conflictId ?? null,
        summary: draft.title ?? `Merge draft for ${internalEntityType} ${internalEntityId}`,
        createdByUserId: userId ?? null,
        items: {
          create: planItems.map((item) => ({
            internalEntityType: item.internalEntityType as CatalogEntityType | null,
            internalEntityId: item.internalEntityId,
            externalEntityType: item.externalEntityType as CatalogEntityType | null,
            externalEntityId: item.externalEntityId,
            scope: item.scope as "CATEGORY" | "PRODUCT" | "MODIFIER_GROUP" | "MODIFIER_OPTION" | "PRODUCT_CATEGORY_LINK" | "PRODUCT_MODIFIER_GROUP_LINK",
            fieldPath: item.fieldPath,
            action: item.action as CatalogSyncAction,
            direction: item.direction as "INTERNAL_TO_EXTERNAL" | "EXTERNAL_TO_INTERNAL" | "BIDIRECTIONAL" | "DISABLED" | null,
            status: item.status as "PENDING" | "READY" | "BLOCKED" | "APPLIED" | "FAILED" | "SKIPPED",
            blockedReason: item.blockedReason,
            previewBeforeValue: item.previewBeforeValue ?? undefined,
            previewAfterValue: item.previewAfterValue ?? undefined,
            conflictId: item.conflictId,
          })),
        },
      },
    });

    // Update draft to PLAN_GENERATED
    await tx.catalogMergeDraft.update({
      where: { id: draftId },
      data: {
        status: "PLAN_GENERATED",
        generatedPlanId: created.id,
        updatedByUserId: userId ?? null,
      },
    });

    // Log execution
    await tx.catalogMergeExecutionLog.create({
      data: {
        draftId,
        generatedPlanId: created.id,
        status: "PLAN_GENERATED",
        requestPayload: { applyTarget, fieldCount: resolvedFields.length, structureCount: resolvedStructures.length },
        responsePayload: { planId: created.id, itemCount: planItems.length },
        changedByUserId: userId ?? null,
      },
    });

    return created;
  });

  return plan.id;
}
