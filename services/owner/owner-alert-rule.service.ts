/**
 * Owner Alert Rule Service — tenant-scoped CRUD for AlertRule records.
 *
 * All functions enforce tenantId scoping to prevent cross-tenant access.
 */
import { prisma } from "@/lib/prisma";
import type {
  AlertRule,
  AlertRuleListResult,
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
} from "@/types/owner-notifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toAlertRule(row: {
  id: string;
  tenantId: string;
  storeId: string | null;
  metricType: string;
  threshold: { toNumber: () => number } | number;
  windowMinutes: number;
  enabled: boolean;
  lastFiredAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  store: { id: string; name: string } | null;
  createdByUser: { id: string; name: string } | null;
}): AlertRule {
  return {
    id: row.id,
    tenantId: row.tenantId,
    storeId: row.storeId,
    storeName: row.store?.name ?? null,
    metricType: row.metricType as AlertRule["metricType"],
    threshold:
      typeof row.threshold === "number"
        ? row.threshold
        : row.threshold.toNumber(),
    windowMinutes: row.windowMinutes,
    enabled: row.enabled,
    lastFiredAt: row.lastFiredAt?.toISOString() ?? null,
    createdBy: row.createdBy,
    createdByName: row.createdByUser?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const includeRelations = {
  store: { select: { id: true, name: true } },
  createdByUser: { select: { id: true, name: true } },
} as const;

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * Paginated list of alert rules for a tenant.
 */
export async function listAlertRules(
  tenantId: string,
  page = 1,
  pageSize = 50
): Promise<AlertRuleListResult> {
  const where = { tenantId };
  const [rows, total] = await Promise.all([
    prisma.alertRule.findMany({
      where,
      include: includeRelations,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.alertRule.count({ where }),
  ]);

  return { items: rows.map(toAlertRule), total, page, pageSize };
}

/**
 * Fetch a single alert rule, enforcing tenant ownership.
 */
export async function getAlertRule(
  tenantId: string,
  ruleId: string
): Promise<AlertRule | null> {
  const row = await prisma.alertRule.findFirst({
    where: { id: ruleId, tenantId },
    include: includeRelations,
  });
  return row ? toAlertRule(row) : null;
}

/**
 * Create a new alert rule for a tenant.
 */
export async function createAlertRule(
  tenantId: string,
  actorUserId: string,
  input: CreateAlertRuleInput
): Promise<AlertRule> {
  // Validate storeId belongs to tenant when provided
  if (input.storeId) {
    const store = await prisma.store.findFirst({
      where: { id: input.storeId, tenantId },
      select: { id: true },
    });
    if (!store) throw new Error("Store not found or does not belong to tenant");
  }

  const row = await prisma.alertRule.create({
    data: {
      tenantId,
      storeId: input.storeId ?? null,
      metricType: input.metricType,
      threshold: input.threshold,
      windowMinutes: input.windowMinutes ?? 60,
      enabled: true,
      createdBy: actorUserId,
    },
    include: includeRelations,
  });

  return toAlertRule(row);
}

/**
 * Update fields on an existing alert rule.
 * Returns null if the rule does not belong to the tenant.
 */
export async function updateAlertRule(
  tenantId: string,
  ruleId: string,
  input: UpdateAlertRuleInput
): Promise<AlertRule | null> {
  const existing = await prisma.alertRule.findFirst({
    where: { id: ruleId, tenantId },
    select: { id: true },
  });
  if (!existing) return null;

  // Validate new storeId when provided
  if (input.storeId) {
    const store = await prisma.store.findFirst({
      where: { id: input.storeId, tenantId },
      select: { id: true },
    });
    if (!store) throw new Error("Store not found or does not belong to tenant");
  }

  const row = await prisma.alertRule.update({
    where: { id: ruleId },
    data: {
      ...(input.storeId !== undefined ? { storeId: input.storeId } : {}),
      ...(input.metricType !== undefined ? { metricType: input.metricType } : {}),
      ...(input.threshold !== undefined ? { threshold: input.threshold } : {}),
      ...(input.windowMinutes !== undefined ? { windowMinutes: input.windowMinutes } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    },
    include: includeRelations,
  });

  return toAlertRule(row);
}

/**
 * Toggle the enabled flag on an alert rule.
 * Returns null if the rule does not belong to the tenant.
 */
export async function toggleAlertRule(
  tenantId: string,
  ruleId: string,
  enabled: boolean
): Promise<AlertRule | null> {
  return updateAlertRule(tenantId, ruleId, { enabled });
}

/**
 * Delete an alert rule, enforcing tenant ownership.
 * Returns true if deleted, false if not found.
 */
export async function deleteAlertRule(
  tenantId: string,
  ruleId: string
): Promise<boolean> {
  const existing = await prisma.alertRule.findFirst({
    where: { id: ruleId, tenantId },
    select: { id: true },
  });
  if (!existing) return false;

  await prisma.alertRule.delete({ where: { id: ruleId } });
  return true;
}
