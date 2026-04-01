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
    ACTIVE: "활성",
    INACTIVE: "비활성",
    ARCHIVED: "보관됨",
  };
  return map[s] ?? s;
}

export function labelFlagScopeType(s: FlagScopeType): string {
  const map: Record<FlagScopeType, string> = {
    GLOBAL: "전체(Global)",
    TENANT: "테넌트",
    STORE: "매장",
    USER: "사용자",
    ROLE: "역할",
    PORTAL: "포탈",
    PROVIDER: "Provider",
    ENVIRONMENT: "환경",
    PERCENTAGE: "비율(%)",
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
