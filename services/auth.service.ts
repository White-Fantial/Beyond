import type { LoginCredentials, AuthResult } from "@/domains/auth/types";

export async function login(_credentials: LoginCredentials): Promise<AuthResult> {
  throw new Error("Auth service not yet implemented");
}

export async function logout(_token: string): Promise<void> {
  throw new Error("Auth service not yet implemented");
}
