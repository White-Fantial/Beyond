import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  registerPushSubscription,
  unregisterPushSubscription,
} from "@/services/push-notifications.service";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await req.json();
    const record = await registerPushSubscription(ctx.userId, body);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (err) {
    console.error("[push/subscribe POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await req.json();
    const { endpoint } = body as { endpoint?: string };
    if (!endpoint) {
      return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
    }
    await unregisterPushSubscription(ctx.userId, endpoint);
    return NextResponse.json({ data: null });
  } catch (err) {
    console.error("[push/subscribe DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
