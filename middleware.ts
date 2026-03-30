import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME, ROLE_PERMISSIONS, type RoleKey } from "@/lib/auth/constants";

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET ?? "beyond-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

interface SessionPayload {
  userId: string;
  platformRole: RoleKey;
  defaultStoreId: string | null;
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
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.platformRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return NextResponse.next();
  }

  // --- /owner/** ---
  if (pathname.startsWith("/owner")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.platformRole !== "OWNER" && session.platformRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return NextResponse.next();
  }

  // --- /backoffice/** ---
  if (pathname.startsWith("/backoffice")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const operationalRoles: RoleKey[] = ["STAFF", "SUPERVISOR", "MANAGER", "OWNER"];
    if (!operationalRoles.includes(session.platformRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    // Note: store-level access verification happens in the route handler
    return NextResponse.next();
  }

  // --- /app/** ---
  if (pathname.startsWith("/app")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // ADMIN cannot access customer app directly
    if (session.platformRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    // Operational users without CUSTOMER_APP permission cannot access /app
    const rolePerms = ROLE_PERMISSIONS[session.platformRole] ?? [];
    if (!rolePerms.includes("CUSTOMER_APP") && session.platformRole !== "CUSTOMER") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return NextResponse.next();
  }

  // --- /login redirect if already authenticated ---
  if (pathname === "/login" && session) {
    // Redirect to appropriate home
    const roleRedirects: Record<RoleKey, string> = {
      ADMIN: "/admin",
      OWNER: "/owner",
      CUSTOMER: "/app",
      STAFF: "/backoffice/store",
      SUPERVISOR: "/backoffice/store",
      MANAGER: "/backoffice/store",
    };
    const dest = roleRedirects[session.platformRole] ?? "/";
    return NextResponse.redirect(new URL(dest, request.url));
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
