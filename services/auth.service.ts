import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession, verifySession, getSessionCookieOptions } from "@/lib/auth/session";
import { resolvePostLoginRedirect } from "@/lib/auth/redirect";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type { RoleKey } from "@/lib/auth/constants";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  redirectTo?: string;
  error?: string;
}

export async function loginUser(credentials: LoginCredentials): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { email: credentials.email, deletedAt: null },
  });

  if (!user) {
    return { success: false, error: "Invalid email or password" };
  }

  const passwordMatch = await bcrypt.compare(credentials.password, user.password);
  if (!passwordMatch) {
    return { success: false, error: "Invalid email or password" };
  }

  const sessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    platformRole: user.platformRole as RoleKey,
    tenantId: user.tenantId,
    defaultStoreId: user.defaultStoreId,
  };

  const token = await createSession(sessionPayload);
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieOptions(token));

  const redirectTo = await resolvePostLoginRedirect(sessionPayload);

  return { success: true, redirectTo };
}

export async function logoutUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

