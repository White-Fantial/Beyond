import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import {
  getOwnerTeamMember,
  updateOwnerTeamMember,
  removeOwnerTeamMember,
} from "@/services/owner/owner-team.service";

function getOwnerTenantId(ctx: Awaited<ReturnType<typeof getCurrentUserAuthContext>>) {
  if (!ctx) return null;
  const membership = ctx.tenantMemberships.find((tm) =>
    OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
  );
  return membership?.tenantId ?? ctx.tenantMemberships[0]?.tenantId ?? null;
}

interface Params {
  params: Promise<{ membershipId: string }>;
}

/**
 * GET /api/owner/team/[membershipId]
 * Returns a single team member with store assignments.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { membershipId } = await params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const tenantId = getOwnerTenantId(ctx);
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

    if (!ctx.isPlatformAdmin) {
      const hasAccess = ctx.tenantMemberships.some((tm) =>
        OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
      );
      if (!hasAccess) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const member = await getOwnerTeamMember(membershipId, tenantId);
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: member });
  } catch (err) {
    console.error("[owner/team/[membershipId]] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/owner/team/[membershipId]
 * Update role or status of a team member.
 * Body: { role?, status? }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { membershipId } = await params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const tenantId = getOwnerTenantId(ctx);
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

    if (!ctx.isPlatformAdmin) {
      const hasAccess = ctx.tenantMemberships.some((tm) =>
        OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
      );
      if (!hasAccess) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { role, status } = body;

    if (!role && !status) {
      return NextResponse.json({ error: "role or status is required" }, { status: 400 });
    }

    const member = await updateOwnerTeamMember({
      membershipId: membershipId,
      tenantId,
      actorUserId: ctx.userId,
      role: role || undefined,
      status: status || undefined,
    });

    return NextResponse.json({ data: member });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "LAST_OWNER_DEMOTION_BLOCKED") {
      return NextResponse.json(
        { error: "Cannot demote or deactivate the last owner." },
        { status: 422 }
      );
    }
    if (err instanceof Error && err.message === "MEMBERSHIP_NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[owner/team/[membershipId]] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/owner/team/[membershipId]
 * Soft-remove a team member (sets status = REMOVED).
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { membershipId } = await params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const tenantId = getOwnerTenantId(ctx);
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

    if (!ctx.isPlatformAdmin) {
      const hasAccess = ctx.tenantMemberships.some((tm) =>
        OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
      );
      if (!hasAccess) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await removeOwnerTeamMember({
      membershipId: membershipId,
      tenantId,
      actorUserId: ctx.userId,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "LAST_OWNER_DEMOTION_BLOCKED") {
      return NextResponse.json(
        { error: "Cannot remove the last owner." },
        { status: 422 }
      );
    }
    if (err instanceof Error && err.message === "MEMBERSHIP_NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[owner/team/[membershipId]] DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
