import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { updateAdminStore } from "@/services/admin/admin-store.service";

interface Params {
  params: { storeId: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const { storeId } = params;
    const body = await req.json();
    const { name, displayName, timezone, currency, countryCode, status } = body;
    await updateAdminStore(storeId, { name, displayName, timezone, currency, countryCode, status }, ctx.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.startsWith("impersonation_active")) {
      return NextResponse.json({ error: "먼저 impersonation을 종료해주세요." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
