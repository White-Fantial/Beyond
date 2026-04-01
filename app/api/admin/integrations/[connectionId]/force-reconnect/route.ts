import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { requestForceReconnect } from "@/services/admin/admin-integration-recovery.service";

interface Params {
  params: Promise<{ connectionId: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const { connectionId } = await params;
    const body = await req.json();
    const { targetStatus, reason } = body as {
      targetStatus?: string;
      reason?: string;
    };

    if (!targetStatus || !["REAUTH_REQUIRED", "CONNECTING"].includes(targetStatus)) {
      return NextResponse.json(
        { error: "targetStatus 는 REAUTH_REQUIRED 또는 CONNECTING 이어야 합니다." },
        { status: 400 }
      );
    }

    const result = await requestForceReconnect({
      connectionId,
      targetStatus: targetStatus as "REAUTH_REQUIRED" | "CONNECTING",
      reason: reason ?? "",
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
    console.error("[admin] force-reconnect error:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
