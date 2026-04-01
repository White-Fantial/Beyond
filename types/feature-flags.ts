export type FlagType = "BOOLEAN" | "STRING" | "INTEGER" | "JSON" | "VARIANT";
export type FlagStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type FlagScopeType =
  | "GLOBAL"
  | "TENANT"
  | "STORE"
  | "USER"
  | "ROLE"
  | "PORTAL"
  | "PROVIDER"
  | "ENVIRONMENT"
  | "PERCENTAGE";

export interface AdminFeatureFlagListItem {
  id: string;
  key: string;
  name: string;
  description: string | null;
  flagType: FlagType;
  status: FlagStatus;
  defaultBoolValue: boolean | null;
  defaultStringValue: string | null;
  defaultIntValue: number | null;
  isExperiment: boolean;
  assignmentCount: number;
  activeAssignmentCount: number;
  updatedAt: Date;
}

export interface AdminFeatureFlagDetail extends AdminFeatureFlagListItem {
  defaultJsonValue: Record<string, unknown> | null;
  ownerNote: string | null;
  createdAt: Date;
  assignments: AdminFeatureFlagAssignment[];
}

export interface AdminFeatureFlagAssignment {
  id: string;
  featureFlagId: string;
  scopeType: FlagScopeType;
  scopeKey: string | null;
  boolValue: boolean | null;
  stringValue: string | null;
  intValue: number | null;
  jsonValue: Record<string, unknown> | null;
  priority: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFeatureFlagInput {
  key: string;
  name: string;
  description?: string;
  flagType: FlagType;
  defaultBoolValue?: boolean;
  defaultStringValue?: string;
  defaultIntValue?: number;
  defaultJsonValue?: Record<string, unknown>;
  isExperiment?: boolean;
  ownerNote?: string;
}

export interface UpdateFeatureFlagInput {
  name?: string;
  description?: string;
  defaultBoolValue?: boolean;
  defaultStringValue?: string;
  defaultIntValue?: number;
  defaultJsonValue?: Record<string, unknown>;
  isExperiment?: boolean;
  ownerNote?: string;
}

export interface CreateFlagAssignmentInput {
  scopeType: FlagScopeType;
  scopeKey?: string;
  boolValue?: boolean;
  stringValue?: string;
  intValue?: number;
  jsonValue?: Record<string, unknown>;
  priority?: number;
  startsAt?: string;
  endsAt?: string;
  note?: string;
}

export interface FlagEvaluationContext {
  tenantId?: string;
  storeId?: string;
  userId?: string;
  role?: string;
  portal?: string;
  provider?: string;
  environment?: string;
}

export interface FlagEvaluationResult {
  flagKey: string;
  enabled: boolean;
  value: boolean | string | number | Record<string, unknown> | null;
  source: "global_default" | "assignment" | "not_found";
  scopeType?: FlagScopeType;
  scopeKey?: string;
}
