import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createImpersonationToken,
  getImpersonationCookieOptions,
  clearImpersonationCookieOptions,
  getImpersonationState,
  type ImpersonationPayload,
} from "@/lib/auth/impersonation";
import { PLATFORM_ROLES } from "@/lib/auth/constants";
import type { MembershipRoleKey, StoreRoleKey } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { resolvePostLoginRedirect } from "@/lib/auth/redirect";
import type { SessionPayload } from "@/lib/auth/session";

// ─── POST /api/admin/impersonate — start impersonation ───────────────────────

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.platformRole !== PLATFORM_ROLES.PLATFORM_ADMIN) {
    return NextResponse.json({ error: "Forbidden: only PLATFORM_ADMIN can impersonate" }, { status: 403 });
  }

  let body: { userId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId: targetUserId, reason } = body;
  if (!targetUserId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Load actor info
  const actor = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, status: true, platformRole: true },
  });
  if (!actor || actor.status !== "ACTIVE" || actor.platformRole !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Actor account invalid" }, { status: 403 });
  }

  // Load target user
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
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

  if (!target) {
    await logAuditEvent({
      actorUserId: actor.id,
      action: "impersonation.denied",
      targetType: "User",
      targetId: targetUserId,
      metadata: { reason: "target_not_found" },
    });
    return NextResponse.json({ error: "Target user not found" }, { status: 404 });
  }

  // Policy enforcement
  if (target.platformRole === PLATFORM_ROLES.PLATFORM_ADMIN) {
    await logAuditEvent({
      actorUserId: actor.id,
      action: "impersonation.denied",
      targetType: "User",
      targetId: target.id,
      metadata: { reason: "target_is_platform_admin", targetEmail: target.email },
    });
    return NextResponse.json({ error: "Cannot impersonate another PLATFORM_ADMIN" }, { status: 403 });
  }

  const inactiveStatuses = ["SUSPENDED", "ARCHIVED"];
  if (inactiveStatuses.includes(target.status)) {
    await logAuditEvent({
      actorUserId: actor.id,
      action: "impersonation.denied",
      targetType: "User",
      targetId: target.id,
      metadata: { reason: "target_inactive", targetStatus: target.status, targetEmail: target.email },
    });
    return NextResponse.json({ error: "Cannot impersonate an inactive user" }, { status: 403 });
  }

  // Derive effective user's primary membership/store for middleware routing
  const primaryMembership = target.memberships[0] ?? null;
  const primaryStoreMembership = primaryMembership?.storeMemberships[0] ?? null;

  const impersonationPayload: ImpersonationPayload = {
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name,
    effectiveUserId: target.id,
    effectiveEmail: target.email,
    effectiveName: target.name,
    effectivePlatformRole: target.platformRole as ImpersonationPayload["effectivePlatformRole"],
    effectivePrimaryMembershipRole: primaryMembership
      ? (primaryMembership.role as MembershipRoleKey)
      : null,
    effectivePrimaryStoreId: primaryStoreMembership?.storeId ?? null,
    effectivePrimaryStoreRole: primaryStoreMembership
      ? (primaryStoreMembership.role as StoreRoleKey)
      : null,
    startedAt: new Date().toISOString(),
    reason: reason ?? null,
  };

  const token = await createImpersonationToken(impersonationPayload);

  // Resolve redirect URL based on effective user
  const effectiveSession: SessionPayload = {
    userId: target.id,
    email: target.email,
    name: target.name,
    platformRole: target.platformRole as SessionPayload["platformRole"],
    primaryTenantId: primaryMembership?.tenantId ?? null,
    primaryMembershipRole: impersonationPayload.effectivePrimaryMembershipRole,
    primaryStoreId: impersonationPayload.effectivePrimaryStoreId,
    primaryStoreRole: impersonationPayload.effectivePrimaryStoreRole,
  };
  const redirectUrl = await resolvePostLoginRedirect(effectiveSession);

  await logAuditEvent({
    actorUserId: actor.id,
    action: "impersonation.started",
    targetType: "User",
    targetId: target.id,
    metadata: {
      targetEmail: target.email,
      targetPlatformRole: target.platformRole,
      reason: reason ?? null,
      redirectUrl,
    },
  });

  const response = NextResponse.json({ redirectUrl });
  const cookieOpts = getImpersonationCookieOptions(token);
  response.cookies.set({
    name: cookieOpts.name,
    value: cookieOpts.value,
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    maxAge: cookieOpts.maxAge,
    path: cookieOpts.path,
  });
  return response;
}

// ─── DELETE /api/admin/impersonate — end impersonation ───────────────────────

export async function DELETE(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.platformRole !== PLATFORM_ROLES.PLATFORM_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const impersonation = await getImpersonationState();
  if (!impersonation) {
    return NextResponse.json({ error: "Not currently impersonating" }, { status: 400 });
  }

  await logAuditEvent({
    actorUserId: session.userId,
    action: "impersonation.ended",
    targetType: "User",
    targetId: impersonation.effectiveUserId,
    metadata: {
      targetEmail: impersonation.effectiveEmail,
      startedAt: impersonation.startedAt,
      endedAt: new Date().toISOString(),
    },
  });

  const redirectUrl = `/admin/users/${impersonation.effectiveUserId}`;
  const response = NextResponse.json({ redirectUrl });
  const clearOpts = clearImpersonationCookieOptions();
  response.cookies.set({
    name: clearOpts.name,
    value: clearOpts.value,
    httpOnly: clearOpts.httpOnly,
    secure: clearOpts.secure,
    sameSite: clearOpts.sameSite,
    maxAge: clearOpts.maxAge,
    path: clearOpts.path,
  });
  return response;
}
