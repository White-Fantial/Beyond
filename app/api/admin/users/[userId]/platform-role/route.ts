import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { updateAdminUserPlatformRole } from "@/services/admin/admin-user.service";

interface Params {
  params: Promise<{ userId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const { userId } = await params;
    const body = await req.json();
    const { platformRole } = body;
    if (!platformRole || typeof platformRole !== "string") {
      return NextResponse.json({ error: "platformRole is required" }, { status: 400 });
    }
    await updateAdminUserPlatformRole(userId, platformRole, ctx.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.startsWith("impersonation_active")) {
      return NextResponse.json({ error: "먼저 impersonation을 종료해주세요." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
