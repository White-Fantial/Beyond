import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import {
  listOwnerTeamMembers,
  inviteOwnerTeamMember,
} from "@/services/owner/owner-team.service";

function getOwnerTenantId(ctx: Awaited<ReturnType<typeof getCurrentUserAuthContext>>) {
  if (!ctx) return null;
  const membership = ctx.tenantMemberships.find((tm) =>
    OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
  );
  return membership?.tenantId ?? ctx.tenantMemberships[0]?.tenantId ?? null;
}

/**
 * GET /api/owner/team
 * Returns all team members for the tenant.
 */
export async function GET() {
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

    const members = await listOwnerTeamMembers(tenantId);
    return NextResponse.json({ data: members });
  } catch (err) {
    console.error("[owner/team] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/owner/team
 * Invite a new team member.
 * Body: { email, name?, role? }
 */
export async function POST(req: NextRequest) {
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
    const { email, name, role } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const member = await inviteOwnerTeamMember({
      tenantId,
      actorUserId: ctx.userId,
      email: email.trim().toLowerCase(),
      name: name?.trim() || undefined,
      role: role || undefined,
    });

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (err) {
    console.error("[owner/team] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
