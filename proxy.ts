import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME, IMPERSONATION_COOKIE_NAME, OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import type { PlatformRoleKey, MembershipRoleKey } from "@/lib/auth/constants";

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET ?? "beyond-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

interface SessionPayload {
  userId: string;
  platformRole: PlatformRoleKey;
  primaryMembershipRole: MembershipRoleKey | null;
  primaryStoreId: string | null;
}

interface ImpersonationPayload {
  actorUserId: string;
  effectiveUserId: string;
  effectivePlatformRole: PlatformRoleKey;
  effectivePrimaryMembershipRole: MembershipRoleKey | null;
  effectivePrimaryStoreId: string | null;
}

async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

async function getImpersonationFromRequest(request: NextRequest): Promise<ImpersonationPayload | null> {
  const token = request.cookies.get(IMPERSONATION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as ImpersonationPayload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionFromRequest(request);
  const impersonation = await getImpersonationFromRequest(request);

  // Determine effective role/store for routing decisions.
  // During impersonation the effective user governs portal access,
  // but the actor (PLATFORM_ADMIN) can still always reach /admin.
  const effectivePlatformRole = impersonation
    ? impersonation.effectivePlatformRole
    : session?.platformRole ?? null;
  const effectivePrimaryMembershipRole = impersonation
    ? impersonation.effectivePrimaryMembershipRole
    : session?.primaryMembershipRole ?? null;
  const effectivePrimaryStoreId = impersonation
    ? impersonation.effectivePrimaryStoreId
    : session?.primaryStoreId ?? null;

  // --- /admin/** ---
  // Always requires the *actor* to be PLATFORM_ADMIN regardless of impersonation.
  if (pathname.startsWith("/admin")) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    if (session.platformRole !== "PLATFORM_ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return NextResponse.next();
  }

  // --- /owner/** ---
  if (pathname.startsWith("/owner")) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    const canAccessOwner =
      // Actor is admin and NOT impersonating → allow
      (session.platformRole === "PLATFORM_ADMIN" && !impersonation) ||
      // During impersonation, check effective user's roles
      (effectivePrimaryMembershipRole !== null &&
        OWNER_PORTAL_MEMBERSHIP_ROLES.includes(effectivePrimaryMembershipRole));
    if (!canAccessOwner) return NextResponse.redirect(new URL("/unauthorized", request.url));
    return NextResponse.next();
  }

  // --- /backoffice/** ---
  if (pathname.startsWith("/backoffice")) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    const hasStoreAccess =
      // Actor is admin and NOT impersonating → allow
      (session.platformRole === "PLATFORM_ADMIN" && !impersonation) ||
      // During impersonation, check effective user's store/membership
      effectivePrimaryStoreId !== null ||
      (effectivePrimaryMembershipRole !== null &&
        OWNER_PORTAL_MEMBERSHIP_ROLES.includes(effectivePrimaryMembershipRole));
    if (!hasStoreAccess) return NextResponse.redirect(new URL("/unauthorized", request.url));
    return NextResponse.next();
  }

  // --- /app/** ---
  if (pathname.startsWith("/app")) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    // During impersonation an admin is allowed to visit /app as the effective user.
    // Without impersonation, redirect PLATFORM_ADMIN to /admin.
    if (!impersonation && session.platformRole === "PLATFORM_ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // --- /login redirect if already authenticated ---
  if (pathname === "/login" && session) {
    if (session.platformRole === "PLATFORM_ADMIN") return NextResponse.redirect(new URL("/admin", request.url));
    // OWNER: send to backoffice first if they have a primary store; otherwise /owner
    if (
      session.primaryMembershipRole !== null &&
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(session.primaryMembershipRole)
    ) {
      if (session.primaryStoreId) {
        return NextResponse.redirect(new URL(`/backoffice/store/${session.primaryStoreId}/orders`, request.url));
      }
      return NextResponse.redirect(new URL("/owner/dashboard", request.url));
    }
    if (session.primaryStoreId) {
      return NextResponse.redirect(new URL(`/backoffice/store/${session.primaryStoreId}/orders`, request.url));
    }
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/owner/:path*",
    "/backoffice/:path*",
    "/app/:path*",
    "/login",
  ],
};
