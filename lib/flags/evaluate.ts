import { prisma } from "@/lib/prisma";
import { hashToPercentage } from "./hashing";
import { FLAG_DEFAULTS } from "./defaults";
import type {
  FlagEvaluationContext,
  FlagEvaluationResult,
  FlagScopeType,
} from "@/types/feature-flags";

/**
 * Evaluate a single feature flag for the given context.
 * Priority order (highest wins):
 *   USER > STORE > TENANT > ROLE > PORTAL > PROVIDER > ENVIRONMENT > PERCENTAGE > GLOBAL > default
 */
export async function evaluateFlag(
  flagKey: string,
  context: FlagEvaluationContext = {}
): Promise<FlagEvaluationResult> {
  const flag = await prisma.featureFlag.findUnique({
    where: { key: flagKey },
    include: {
      assignments: {
        where: { isActive: true },
        orderBy: { priority: "desc" },
      },
    },
  });

  if (!flag) {
    const defaultEnabled = FLAG_DEFAULTS[flagKey] ?? false;
    return {
      flagKey,
      enabled: defaultEnabled,
      value: defaultEnabled,
      source: "not_found",
    };
  }

  if (flag.status !== "ACTIVE") {
    return {
      flagKey,
      enabled: false,
      value: false,
      source: "global_default",
    };
  }

  const now = new Date();
  const activeAssignments = flag.assignments.filter((a) => {
    if (a.startsAt && a.startsAt > now) return false;
    if (a.endsAt && a.endsAt < now) return false;
    return true;
  });

  // Scope priority order
  const scopePriority: FlagScopeType[] = [
    "USER",
    "STORE",
    "TENANT",
    "ROLE",
    "PORTAL",
    "PROVIDER",
    "ENVIRONMENT",
    "PERCENTAGE",
    "GLOBAL",
  ];

  for (const scopeType of scopePriority) {
    const match = activeAssignments.find((a) => {
      if (a.scopeType !== scopeType) return false;
      switch (scopeType) {
        case "GLOBAL":
          return true;
        case "USER":
          return a.scopeKey === context.userId;
        case "STORE":
          return a.scopeKey === context.storeId;
        case "TENANT":
          return a.scopeKey === context.tenantId;
        case "ROLE":
          return a.scopeKey === context.role;
        case "PORTAL":
          return a.scopeKey === context.portal;
        case "PROVIDER":
          return a.scopeKey === context.provider;
        case "ENVIRONMENT":
          return a.scopeKey === context.environment;
        case "PERCENTAGE": {
          const pct = parseInt(a.scopeKey ?? "0", 10);
          // Prefer a stable entity ID (userId or tenantId) for consistent bucketing.
          // Anonymous sessions without either ID will all share the "anon" bucket
          // and receive the same result — this is intentional for unauthenticated paths.
          const entityId = context.userId ?? context.tenantId ?? "anon";
          return hashToPercentage(`${flagKey}:${entityId}`) < pct;
        }
        default:
          return false;
      }
    });

    if (match) {
      const value = resolveFlagValue(flag.flagType, match);
      return {
        flagKey,
        enabled: typeof value === "boolean" ? value : value !== null,
        value,
        source: "assignment",
        scopeType: match.scopeType as FlagScopeType,
        scopeKey: match.scopeKey ?? undefined,
      };
    }
  }

  // Fall back to flag's own default value
  const defaultValue = resolveFlagDefaultValue(flag);
  return {
    flagKey,
    enabled: typeof defaultValue === "boolean" ? defaultValue : defaultValue !== null,
    value: defaultValue,
    source: "global_default",
  };
}

/** Evaluate multiple flags at once. */
export async function evaluateFlags(
  flagKeys: string[],
  context: FlagEvaluationContext = {}
): Promise<Record<string, FlagEvaluationResult>> {
  const results = await Promise.all(flagKeys.map((key) => evaluateFlag(key, context)));
  return Object.fromEntries(results.map((r) => [r.flagKey, r]));
}

/** Simple boolean check — most common use case. */
export async function isFlagEnabled(
  flagKey: string,
  context: FlagEvaluationContext = {}
): Promise<boolean> {
  const result = await evaluateFlag(flagKey, context);
  return result.enabled;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function resolveFlagValue(
  flagType: string,
  assignment: {
    boolValue: boolean | null;
    stringValue: string | null;
    intValue: number | null;
    jsonValue: unknown;
  }
): boolean | string | number | Record<string, unknown> | null {
  switch (flagType) {
    case "BOOLEAN":
      return assignment.boolValue;
    case "STRING":
      return assignment.stringValue;
    case "INTEGER":
      return assignment.intValue;
    case "JSON":
      return (assignment.jsonValue as Record<string, unknown>) ?? null;
    case "VARIANT":
      return assignment.stringValue;
    default:
      return assignment.boolValue;
  }
}

function resolveFlagDefaultValue(flag: {
  flagType: string;
  defaultBoolValue: boolean | null;
  defaultStringValue: string | null;
  defaultIntValue: number | null;
  defaultJsonValue: unknown;
}): boolean | string | number | Record<string, unknown> | null {
  switch (flag.flagType) {
    case "BOOLEAN":
      return flag.defaultBoolValue;
    case "STRING":
      return flag.defaultStringValue;
    case "INTEGER":
      return flag.defaultIntValue;
    case "JSON":
      return (flag.defaultJsonValue as Record<string, unknown>) ?? null;
    case "VARIANT":
      return flag.defaultStringValue;
    default:
      return flag.defaultBoolValue;
  }
}
