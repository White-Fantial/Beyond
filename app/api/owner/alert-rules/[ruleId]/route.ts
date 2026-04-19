import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import {
  updateAlertRule,
  deleteAlertRule,
} from "@/services/owner/owner-alert-rule.service";
import type { UpdateAlertRuleInput } from "@/types/owner-notifications";

/**
 * PATCH /api/owner/alert-rules/[ruleId]
 * Body: { storeId?, metricType?, threshold?, windowMinutes?, enabled? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  const { ruleId } = params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const ownerMembership = ctx.tenantMemberships.find((tm) =>
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
    );
    if (!ownerMembership && !ctx.isPlatformAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const tenantId = ownerMembership?.tenantId ?? ctx.tenantMemberships[0]?.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

    const body = await req.json();
    const input = body as UpdateAlertRuleInput;

    const rule = await updateAlertRule(tenantId, ruleId, input);
    if (!rule) {
      return NextResponse.json({ error: "Alert rule not found" }, { status: 404 });
    }

    return NextResponse.json({ data: rule });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Store not found")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[owner/alert-rules PATCH] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/owner/alert-rules/[ruleId]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  const { ruleId } = params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const ownerMembership = ctx.tenantMemberships.find((tm) =>
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
    );
    if (!ownerMembership && !ctx.isPlatformAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const tenantId = ownerMembership?.tenantId ?? ctx.tenantMemberships[0]?.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

    const deleted = await deleteAlertRule(tenantId, ruleId);
    if (!deleted) {
      return NextResponse.json({ error: "Alert rule not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[owner/alert-rules DELETE] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
