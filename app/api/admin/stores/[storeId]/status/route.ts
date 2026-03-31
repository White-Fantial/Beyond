import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { setAdminStoreStatus } from "@/services/admin/admin-store.service";

interface Params {
  params: Promise<{ storeId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requirePlatformAdmin();
    const { storeId } = await params;
    const body = await req.json();
    const { status } = body;
    if (!status || typeof status !== "string") {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }
    await setAdminStoreStatus(storeId, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
