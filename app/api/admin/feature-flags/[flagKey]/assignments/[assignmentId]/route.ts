import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import {
  getAdminFeatureFlagByKey,
  toggleFlagAssignment,
  deleteFlagAssignment,
} from "@/services/admin/admin-feature-flag.service";
import {
  auditAdminFeatureFlagAssignmentToggled,
  auditAdminFeatureFlagAssignmentDeleted,
} from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ flagKey: string; assignmentId: string }> }
) {
  const { flagKey, assignmentId } = await params;
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const flag = await getAdminFeatureFlagByKey(flagKey);
    if (!flag) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();
    await toggleFlagAssignment(assignmentId, body.isActive);
    await auditAdminFeatureFlagAssignmentToggled(
      assignmentId,
      flag.id,
      ctx.userId,
      { flagKey: flag.key, isActive: body.isActive }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ flagKey: string; assignmentId: string }> }
) {
  const { flagKey, assignmentId } = await params;
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const flag = await getAdminFeatureFlagByKey(flagKey);
    if (!flag) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await deleteFlagAssignment(assignmentId);
    await auditAdminFeatureFlagAssignmentDeleted(
      assignmentId,
      flag.id,
      ctx.userId,
      { flagKey: flag.key }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
