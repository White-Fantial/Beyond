import { prisma } from "@/lib/prisma";
import type {
  AdminFeatureFlagListItem,
  AdminFeatureFlagDetail,
  AdminFeatureFlagAssignment,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  CreateFlagAssignmentInput,
  FlagStatus,
  FlagType,
  FlagScopeType,
} from "@/types/feature-flags";
import type { Prisma } from "@prisma/client";

// ─── List ──────────────────────────────────────────────────────────────────────

export async function listAdminFeatureFlags(opts: {
  status?: FlagStatus;
  search?: string;
} = {}): Promise<AdminFeatureFlagListItem[]> {
  const where: Prisma.FeatureFlagWhereInput = {};
  if (opts.status) where.status = opts.status as never;
  if (opts.search) {
    where.OR = [
      { key: { contains: opts.search, mode: "insensitive" } },
      { name: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const flags = await prisma.featureFlag.findMany({
    where,
    include: {
      assignments: { select: { id: true, isActive: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  return flags.map((f) => ({
    id: f.id,
    key: f.key,
    name: f.name,
    description: f.description,
    flagType: f.flagType as FlagType,
    status: f.status as FlagStatus,
    defaultBoolValue: f.defaultBoolValue,
    defaultStringValue: f.defaultStringValue,
    defaultIntValue: f.defaultIntValue,
    isExperiment: f.isExperiment,
    assignmentCount: f.assignments.length,
    activeAssignmentCount: f.assignments.filter((a) => a.isActive).length,
    updatedAt: f.updatedAt,
  }));
}

// ─── Detail ────────────────────────────────────────────────────────────────────

export async function getAdminFeatureFlagByKey(
  key: string
): Promise<AdminFeatureFlagDetail | null> {
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
    include: {
      assignments: {
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!flag) return null;

  return {
    id: flag.id,
    key: flag.key,
    name: flag.name,
    description: flag.description,
    flagType: flag.flagType as FlagType,
    status: flag.status as FlagStatus,
    defaultBoolValue: flag.defaultBoolValue,
    defaultStringValue: flag.defaultStringValue,
    defaultIntValue: flag.defaultIntValue,
    defaultJsonValue: (flag.defaultJsonValue as Record<string, unknown>) ?? null,
    isExperiment: flag.isExperiment,
    ownerNote: flag.ownerNote,
    assignmentCount: flag.assignments.length,
    activeAssignmentCount: flag.assignments.filter((a) => a.isActive).length,
    createdAt: flag.createdAt,
    updatedAt: flag.updatedAt,
    assignments: flag.assignments.map(mapAssignment),
  };
}

// ─── Create ────────────────────────────────────────────────────────────────────

export async function createAdminFeatureFlag(
  input: CreateFeatureFlagInput
): Promise<{ id: string; key: string }> {
  const flag = await prisma.featureFlag.create({
    data: {
      key: input.key.trim().toLowerCase(),
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      flagType: (input.flagType ?? "BOOLEAN") as never,
      defaultBoolValue: input.defaultBoolValue ?? null,
      defaultStringValue: input.defaultStringValue ?? null,
      defaultIntValue: input.defaultIntValue ?? null,
      defaultJsonValue:
        input.defaultJsonValue != null
          ? (input.defaultJsonValue as Prisma.InputJsonValue)
          : undefined,
      isExperiment: input.isExperiment ?? false,
      ownerNote: input.ownerNote?.trim() ?? null,
    },
  });
  return { id: flag.id, key: flag.key };
}

// ─── Update ────────────────────────────────────────────────────────────────────

export async function updateAdminFeatureFlag(
  flagId: string,
  input: UpdateFeatureFlagInput
): Promise<void> {
  await prisma.featureFlag.update({
    where: { id: flagId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && {
        description: input.description?.trim() ?? null,
      }),
      ...(input.defaultBoolValue !== undefined && {
        defaultBoolValue: input.defaultBoolValue,
      }),
      ...(input.defaultStringValue !== undefined && {
        defaultStringValue: input.defaultStringValue,
      }),
      ...(input.defaultIntValue !== undefined && {
        defaultIntValue: input.defaultIntValue,
      }),
      ...(input.defaultJsonValue !== undefined && {
        defaultJsonValue:
          input.defaultJsonValue != null
            ? (input.defaultJsonValue as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      }),
      ...(input.isExperiment !== undefined && { isExperiment: input.isExperiment }),
      ...(input.ownerNote !== undefined && {
        ownerNote: input.ownerNote?.trim() ?? null,
      }),
    },
  });
}

// ─── Status ────────────────────────────────────────────────────────────────────

export async function setAdminFeatureFlagStatus(
  flagId: string,
  status: FlagStatus
): Promise<void> {
  await prisma.featureFlag.update({
    where: { id: flagId },
    data: { status: status as never },
  });
}

// ─── Assignment ────────────────────────────────────────────────────────────────

export async function createFlagAssignment(
  featureFlagId: string,
  input: CreateFlagAssignmentInput
): Promise<{ id: string }> {
  const assignment = await prisma.featureFlagAssignment.create({
    data: {
      featureFlagId,
      scopeType: (input.scopeType ?? "GLOBAL") as never,
      scopeKey: input.scopeKey?.trim() ?? null,
      boolValue: input.boolValue ?? null,
      stringValue: input.stringValue ?? null,
      intValue: input.intValue ?? null,
      jsonValue:
        input.jsonValue != null
          ? (input.jsonValue as Prisma.InputJsonValue)
          : undefined,
      priority: input.priority ?? 0,
      isActive: true,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      note: input.note?.trim() ?? null,
    },
  });
  return { id: assignment.id };
}

export async function toggleFlagAssignment(
  assignmentId: string,
  isActive: boolean
): Promise<void> {
  await prisma.featureFlagAssignment.update({
    where: { id: assignmentId },
    data: { isActive },
  });
}

export async function deleteFlagAssignment(assignmentId: string): Promise<void> {
  await prisma.featureFlagAssignment.delete({ where: { id: assignmentId } });
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function mapAssignment(a: {
  id: string;
  featureFlagId: string;
  scopeType: string;
  scopeKey: string | null;
  boolValue: boolean | null;
  stringValue: string | null;
  intValue: number | null;
  jsonValue: unknown;
  priority: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminFeatureFlagAssignment {
  return {
    id: a.id,
    featureFlagId: a.featureFlagId,
    scopeType: a.scopeType as FlagScopeType,
    scopeKey: a.scopeKey,
    boolValue: a.boolValue,
    stringValue: a.stringValue,
    intValue: a.intValue,
    jsonValue: (a.jsonValue as Record<string, unknown>) ?? null,
    priority: a.priority,
    isActive: a.isActive,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    note: a.note,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}
