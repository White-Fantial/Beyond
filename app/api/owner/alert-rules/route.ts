import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import {
  listAlertRules,
  createAlertRule,
} from "@/services/owner/owner-alert-rule.service";
import type { CreateAlertRuleInput } from "@/types/owner-notifications";

/**
 * GET /api/owner/alert-rules
 * Query: page, pageSize
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10)));

    const result = await listAlertRules(tenantId, page, pageSize);
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[owner/alert-rules GET] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/owner/alert-rules
 * Body: { storeId?, metricType, threshold, windowMinutes? }
 */
export async function POST(req: NextRequest) {
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
    const { storeId, metricType, threshold, windowMinutes } = body as CreateAlertRuleInput;

    if (!metricType || threshold === undefined) {
      return NextResponse.json(
        { error: "metricType and threshold are required" },
        { status: 400 }
      );
    }

    const rule = await createAlertRule(tenantId, ctx.userId, {
      storeId,
      metricType,
      threshold,
      windowMinutes,
    });

    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Store not found")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[owner/alert-rules POST] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
