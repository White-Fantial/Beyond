export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = "SUPER_ADMIN" | "TENANT_ADMIN" | "STORE_MANAGER" | "STAFF";

export interface Session {
  userId: string;
  tenantId: string;
  role: UserRole;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
  token: string;
}
