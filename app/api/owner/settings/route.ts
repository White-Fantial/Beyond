import { NextRequest, NextResponse } from "next/server";
import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import {
  getOwnerTenantSettings,
  updateOwnerTenantSettings,
} from "@/services/owner/owner-settings.service";

function resolveTenantId(ctx: Awaited<ReturnType<typeof requireOwnerAdminAccess>>): string {
  return ctx.tenantMemberships[0]?.tenantId ?? "";
}

export async function GET(_req: NextRequest) {
  try {
    const ctx = await requireOwnerAdminAccess();
    const tenantId = resolveTenantId(ctx);
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 403 });
    const settings = await getOwnerTenantSettings(tenantId);
    return NextResponse.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireOwnerAdminAccess();
    const tenantId = resolveTenantId(ctx);
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 403 });
    const body = await req.json();

    await updateOwnerTenantSettings({
      tenantId,
      actorUserId: ctx.userId,
      data: body,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
