import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { updateAdminConnectionStatus } from "@/services/admin/admin-integration.service";

const ALLOWED_STATUSES = ["CONNECTED", "DISCONNECTED", "REAUTH_REQUIRED", "ERROR", "NOT_CONNECTED"];

interface Params {
  params: Promise<{ connectionId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const { connectionId } = await params;
    const body = await req.json();
    const { status } = body as { status?: string };

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "유효하지 않은 상태 값입니다." }, { status: 400 });
    }

    await updateAdminConnectionStatus(connectionId, status, ctx.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.startsWith("impersonation_active")) {
      return NextResponse.json({ error: "먼저 impersonation을 종료해주세요." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
