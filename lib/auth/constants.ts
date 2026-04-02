// Platform-level roles (on User model)
export const PLATFORM_ROLES = {
  USER: "USER",
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  PLATFORM_SUPPORT: "PLATFORM_SUPPORT",
} as const;

export type PlatformRoleKey = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

// Tenant membership roles
export const MEMBERSHIP_ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
  ANALYST: "ANALYST",
} as const;

export type MembershipRoleKey = (typeof MEMBERSHIP_ROLES)[keyof typeof MEMBERSHIP_ROLES];

// Store-level roles
export const STORE_ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  SUPERVISOR: "SUPERVISOR",
  STAFF: "STAFF",
} as const;

export type StoreRoleKey = (typeof STORE_ROLES)[keyof typeof STORE_ROLES];

// Keep old ROLES for backward compat
export const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  SUPERVISOR: "SUPERVISOR",
  STAFF: "STAFF",
  ANALYST: "ANALYST",
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  PLATFORM_SUPPORT: "PLATFORM_SUPPORT",
  USER: "USER",
} as const;

export type RoleKey = MembershipRoleKey | StoreRoleKey | PlatformRoleKey;

export const PERMISSIONS = {
  CUSTOMER_APP: "CUSTOMER_APP",
  ORDERS: "ORDERS",
  OPERATIONS: "OPERATIONS",
  INVENTORY: "INVENTORY",
  MENU_VIEW: "MENU_VIEW",
  MENU_MANAGE: "MENU_MANAGE",
  CATEGORY_MANAGE: "CATEGORY_MANAGE",
  MODIFIER_MANAGE: "MODIFIER_MANAGE",
  REPORTS: "REPORTS",
  STAFF_MANAGE: "STAFF_MANAGE",
  STORE_SETTINGS: "STORE_SETTINGS",
  INTEGRATIONS: "INTEGRATIONS",
  BILLING: "BILLING",
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Store role → permissions mapping
export const STORE_ROLE_PERMISSIONS: Record<StoreRoleKey, PermissionKey[]> = {
  OWNER: [
    "ORDERS", "OPERATIONS", "INVENTORY", "MENU_VIEW", "MENU_MANAGE",
    "CATEGORY_MANAGE", "MODIFIER_MANAGE", "REPORTS",
    "STAFF_MANAGE", "STORE_SETTINGS", "INTEGRATIONS", "BILLING",
  ],
  ADMIN: [
    "ORDERS", "OPERATIONS", "INVENTORY", "MENU_VIEW", "MENU_MANAGE",
    "CATEGORY_MANAGE", "MODIFIER_MANAGE", "REPORTS",
    "STAFF_MANAGE", "STORE_SETTINGS", "INTEGRATIONS",
  ],
  MANAGER: [
    "ORDERS", "OPERATIONS", "INVENTORY", "MENU_VIEW", "MENU_MANAGE",
    "CATEGORY_MANAGE", "MODIFIER_MANAGE", "REPORTS",
  ],
  SUPERVISOR: ["ORDERS", "OPERATIONS", "INVENTORY", "MENU_VIEW", "REPORTS", "CATEGORY_MANAGE"],
  STAFF: ["ORDERS", "OPERATIONS", "INVENTORY", "MENU_VIEW"],
};

// Membership role → permissions (tenant level)
export const MEMBERSHIP_ROLE_PERMISSIONS: Record<MembershipRoleKey, PermissionKey[]> = {
  OWNER: ["STAFF_MANAGE", "STORE_SETTINGS", "INTEGRATIONS", "BILLING", "REPORTS"],
  ADMIN: ["STAFF_MANAGE", "STORE_SETTINGS", "INTEGRATIONS", "REPORTS"],
  MANAGER: ["STAFF_MANAGE", "REPORTS"],
  STAFF: [],
  ANALYST: ["REPORTS"],
};

// Kept for backward compat
export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  ...STORE_ROLE_PERMISSIONS,
  ...MEMBERSHIP_ROLE_PERMISSIONS,
  USER: ["CUSTOMER_APP"],
  PLATFORM_ADMIN: ["PLATFORM_ADMIN"],
  PLATFORM_SUPPORT: [],
};

// Which membership roles route to /owner portal
export const OWNER_PORTAL_MEMBERSHIP_ROLES: MembershipRoleKey[] = ["OWNER", "ADMIN", "MANAGER"];

// Which membership roles have full write access in the owner portal (store settings, users, billing)
export const OWNER_ADMIN_MEMBERSHIP_ROLES: MembershipRoleKey[] = ["OWNER", "ADMIN"];

// Which store roles route to /backoffice portal
export const BACKOFFICE_STORE_ROLES: StoreRoleKey[] = ["OWNER", "ADMIN", "MANAGER", "SUPERVISOR", "STAFF"];

export const SESSION_COOKIE_NAME = "beyond_session";
export const IMPERSONATION_COOKIE_NAME = "beyond_impersonation";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days
