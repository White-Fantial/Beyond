import type {
  RoleKey,
  PermissionKey,
  PlatformRoleKey,
  MembershipRoleKey,
  StoreRoleKey,
} from "@/lib/auth/constants";

export type { RoleKey, PermissionKey, PlatformRoleKey, MembershipRoleKey, StoreRoleKey };

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  platformRole: PlatformRoleKey;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  userId: string;
  email: string;
  name: string;
  platformRole: PlatformRoleKey;
  primaryTenantId: string | null;
  primaryMembershipRole: MembershipRoleKey | null;
  primaryStoreId: string | null;
  primaryStoreRole: StoreRoleKey | null;
  expiresAt?: Date;
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
  membershipId: string;
  storeRole: StoreRoleKey;
  permissions: PermissionKey[];
}

export interface TenantMembershipInfo {
  tenantId: string;
  membershipId: string;
  membershipRole: MembershipRoleKey;
  storeMemberships: StoreMembershipInfo[];
}

export interface UserAuthContext {
  userId: string;
  email: string;
  name: string;
  platformRole: PlatformRoleKey;
  isPlatformAdmin: boolean;
  isPlatformSupport: boolean;
  tenantMemberships: TenantMembershipInfo[];
  storeMemberships: StoreMembershipInfo[];
  permissions: PermissionKey[];
}
