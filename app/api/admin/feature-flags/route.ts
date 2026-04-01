import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import {
  listAdminFeatureFlags,
  createAdminFeatureFlag,
} from "@/services/admin/admin-feature-flag.service";
import { auditAdminFeatureFlagCreated } from "@/lib/audit";
import type { FlagStatus } from "@/types/feature-flags";

export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdminNotImpersonating();
    const sp = req.nextUrl.searchParams;
    const flags = await listAdminFeatureFlags({
      status: (sp.get("status") as FlagStatus) ?? undefined,
      search: sp.get("search") ?? undefined,
    });
    return NextResponse.json({ flags });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const body = await req.json();
    const result = await createAdminFeatureFlag(body);
    await auditAdminFeatureFlagCreated(result.id, ctx.userId, { key: result.key });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bad Request";
    const status =
      msg.includes("Unique constraint")
        ? 409
        : msg.includes("mpersonation") || msg.includes("nauthorized")
        ? 403
        : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
