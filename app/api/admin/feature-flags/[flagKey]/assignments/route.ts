import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import {
  getAdminFeatureFlagByKey,
  createFlagAssignment,
} from "@/services/admin/admin-feature-flag.service";
import { auditAdminFeatureFlagAssignmentCreated } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ flagKey: string }> }
) {
  const { flagKey } = await params;
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const flag = await getAdminFeatureFlagByKey(flagKey);
    if (!flag) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();
    const result = await createFlagAssignment(flag.id, body);
    await auditAdminFeatureFlagAssignmentCreated(result.id, flag.id, ctx.userId, {
      flagKey: flag.key,
      scopeType: body.scopeType,
      scopeKey: body.scopeKey,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
