import type { FlagType, FlagStatus, FlagScopeType } from "@/types/feature-flags";

export function labelFlagType(t: FlagType): string {
  const map: Record<FlagType, string> = {
    BOOLEAN: "Boolean",
    STRING: "String",
    INTEGER: "Integer",
    JSON: "JSON",
    VARIANT: "Variant",
  };
  return map[t] ?? t;
}

export function labelFlagStatus(s: FlagStatus): string {
  const map: Record<FlagStatus, string> = {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    ARCHIVED: "Archived",
  };
  return map[s] ?? s;
}

export function labelFlagScopeType(s: FlagScopeType): string {
  const map: Record<FlagScopeType, string> = {
    GLOBAL: "All(Global)",
    TENANT: "Tenant",
    STORE: "Stores",
    USER: "Users",
    ROLE: "Role",
    PORTAL: "Portal",
    PROVIDER: "Provider",
    ENVIRONMENT: "Environment",
    PERCENTAGE: "Percentage(%)",
  };
  return map[s] ?? s;
}

export function flagStatusColor(s: FlagStatus): string {
  const map: Record<FlagStatus, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    INACTIVE: "bg-gray-100 text-gray-600",
    ARCHIVED: "bg-red-100 text-red-700",
  };
  return map[s] ?? "bg-gray-100 text-gray-600";
}
