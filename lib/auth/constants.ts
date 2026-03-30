export const ROLES = {
  CUSTOMER: "CUSTOMER",
  STAFF: "STAFF",
  SUPERVISOR: "SUPERVISOR",
  MANAGER: "MANAGER",
  OWNER: "OWNER",
  ADMIN: "ADMIN",
} as const;

export type RoleKey = (typeof ROLES)[keyof typeof ROLES];

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

// Static permission map for middleware/edge use (avoids DB calls in middleware)
export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  CUSTOMER: ["CUSTOMER_APP"],
  STAFF: ["ORDERS", "OPERATIONS", "INVENTORY", "MENU_VIEW"],
  SUPERVISOR: ["ORDERS", "OPERATIONS", "INVENTORY", "MENU_VIEW", "REPORTS", "CATEGORY_MANAGE"],
  MANAGER: [
    "ORDERS", "OPERATIONS", "INVENTORY", "MENU_VIEW", "MENU_MANAGE",
    "CATEGORY_MANAGE", "MODIFIER_MANAGE", "REPORTS",
  ],
  OWNER: [
    "ORDERS", "OPERATIONS", "INVENTORY", "MENU_VIEW", "MENU_MANAGE",
    "CATEGORY_MANAGE", "MODIFIER_MANAGE", "REPORTS",
    "STAFF_MANAGE", "STORE_SETTINGS", "INTEGRATIONS", "BILLING",
  ],
  ADMIN: ["PLATFORM_ADMIN"],
};

// Post-login default redirects
export const ROLE_DEFAULT_REDIRECTS: Record<RoleKey, string> = {
  CUSTOMER: "/app",
  STAFF: "/backoffice/store",
  SUPERVISOR: "/backoffice/store",
  MANAGER: "/backoffice/store",
  OWNER: "/owner",
  ADMIN: "/admin",
};

export const STORE_ROLE_REDIRECT_PATHS: Record<string, string> = {
  STAFF: "orders",
  SUPERVISOR: "operations",
  MANAGER: "dashboard",
};

export const SESSION_COOKIE_NAME = "beyond_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days
