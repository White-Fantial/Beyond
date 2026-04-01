import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import {
  getAdminFeatureFlagByKey,
  updateAdminFeatureFlag,
  setAdminFeatureFlagStatus,
} from "@/services/admin/admin-feature-flag.service";
import {
  auditAdminFeatureFlagUpdated,
  auditAdminFeatureFlagStatusChanged,
} from "@/lib/audit";
import type { FlagStatus } from "@/types/feature-flags";

export async function GET(
  _req: NextRequest,
  { params }: { params: { flagKey: string } }
) {
  try {
    await requirePlatformAdminNotImpersonating();
    const flag = await getAdminFeatureFlagByKey(params.flagKey);
    if (!flag) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ flag });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 403 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { flagKey: string } }
) {
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const flag = await getAdminFeatureFlagByKey(params.flagKey);
    if (!flag) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();

    if (body.status !== undefined) {
      await setAdminFeatureFlagStatus(flag.id, body.status as FlagStatus);
      await auditAdminFeatureFlagStatusChanged(flag.id, ctx.userId, {
        key: flag.key,
        status: body.status,
      });
    } else {
      await updateAdminFeatureFlag(flag.id, body);
      await auditAdminFeatureFlagUpdated(flag.id, ctx.userId, { key: flag.key });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
