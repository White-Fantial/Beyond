import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { resolvePostLoginRedirect } from "@/lib/auth/redirect";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type { PlatformRoleKey, MembershipRoleKey, StoreRoleKey } from "@/lib/auth/constants";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  redirectTo?: string;
  error?: string;
}

export async function loginUser(credentials: LoginCredentials): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: { joinedAt: "asc" },
        take: 1,
        include: {
          storeMemberships: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!user || user.status === "ARCHIVED" || user.status === "SUSPENDED") {
    return { success: false, error: "Invalid email or password" };
  }

  if (!user.passwordHash) {
    return { success: false, error: "Invalid email or password" };
  }

  const passwordMatch = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!passwordMatch) {
    return { success: false, error: "Invalid email or password" };
  }

  const primaryMembership = user.memberships[0] ?? null;
  const primaryStoreMembership = primaryMembership?.storeMemberships[0] ?? null;

  const sessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    platformRole: user.platformRole as PlatformRoleKey,
    primaryTenantId: primaryMembership?.tenantId ?? null,
    primaryMembershipRole: (primaryMembership?.role ?? null) as MembershipRoleKey | null,
    primaryStoreId: primaryStoreMembership?.storeId ?? null,
    primaryStoreRole: (primaryStoreMembership?.role ?? null) as StoreRoleKey | null,
  };

  const token = await createSession(sessionPayload);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const redirectTo = await resolvePostLoginRedirect(sessionPayload);
  return { success: true, token, redirectTo };
}

export async function logoutUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
