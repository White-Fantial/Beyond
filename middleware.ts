import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME, OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionFromRequest(request);

  // --- /admin/** ---
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
      session.platformRole === "PLATFORM_ADMIN" ||
      (session.primaryMembershipRole !== null &&
        OWNER_PORTAL_MEMBERSHIP_ROLES.includes(session.primaryMembershipRole));
    if (!canAccessOwner) return NextResponse.redirect(new URL("/unauthorized", request.url));
    return NextResponse.next();
  }

  // --- /backoffice/** ---
  if (pathname.startsWith("/backoffice")) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    const hasStoreAccess =
      session.platformRole === "PLATFORM_ADMIN" ||
      session.primaryStoreId !== null ||
      (session.primaryMembershipRole !== null &&
        OWNER_PORTAL_MEMBERSHIP_ROLES.includes(session.primaryMembershipRole));
    if (!hasStoreAccess) return NextResponse.redirect(new URL("/unauthorized", request.url));
    return NextResponse.next();
  }

  // --- /app/** ---
  if (pathname.startsWith("/app")) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    if (session.platformRole === "PLATFORM_ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // --- /login redirect if already authenticated ---
  if (pathname === "/login" && session) {
    if (session.platformRole === "PLATFORM_ADMIN") return NextResponse.redirect(new URL("/admin", request.url));
    if (
      session.primaryMembershipRole !== null &&
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(session.primaryMembershipRole)
    ) {
      return NextResponse.redirect(new URL("/owner", request.url));
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
