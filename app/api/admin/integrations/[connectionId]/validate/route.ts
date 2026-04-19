import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { runConnectionValidation } from "@/services/admin/admin-integration-recovery.service";

interface Params {
  params: { connectionId: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const { connectionId } = params;
    const body = await req.json().catch(() => ({}));
    const { reason } = body as { reason?: string };

    const result = await runConnectionValidation({
      connectionId,
      reason,
      actorUserId: ctx.userId,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.startsWith("impersonation_active")) {
      return NextResponse.json(
        { error: "먼저 impersonation을 종료해주세요." },
        { status: 403 }
      );
    }
    console.error("[admin] validate error:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
