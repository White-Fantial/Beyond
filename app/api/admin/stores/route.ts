import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { createAdminStore } from "@/services/admin/admin-store.service";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const body = await req.json();
    const { tenantId, code, name, displayName, timezone, currency, countryCode, status } = body;
    const result = await createAdminStore(
      { tenantId, code, name, displayName, timezone, currency, countryCode, status },
      ctx.userId
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.startsWith("impersonation_active")) {
      return NextResponse.json({ error: "먼저 impersonation을 종료해주세요." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
