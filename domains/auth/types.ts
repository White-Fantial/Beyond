import type { RoleKey, PermissionKey } from "@/lib/auth/constants";

export type { RoleKey, PermissionKey };

export interface User {
  id: string;
  email: string;
  name: string;
  platformRole: RoleKey;
  tenantId: string | null;
  defaultStoreId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  userId: string;
  email: string;
  name: string;
  platformRole: RoleKey;
  tenantId: string | null;
  defaultStoreId: string | null;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  redirectTo?: string;
  error?: string;
}

export interface StoreMembershipInfo {
  storeId: string;
  storeName: string;
  roleKey: RoleKey;
  isDefault: boolean;
  permissions: PermissionKey[];
}

export interface UserAuthContext {
  userId: string;
  email: string;
  name: string;
  platformRole: RoleKey;
  tenantId: string | null;
  defaultStoreId: string | null;
  isAdmin: boolean;
  isOwner: boolean;
  isCustomer: boolean;
  isOperationalUser: boolean;
  storeMemberships: StoreMembershipInfo[];
  permissions: PermissionKey[];
}

