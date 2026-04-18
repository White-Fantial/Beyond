import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { refreshAccountStatus } from "@/lib/stripe/connect";

export async function GET() {
  const ctx = await requireAuth();

  try {
    const status = await refreshAccountStatus(ctx.userId);
    return NextResponse.json({ data: status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to refresh Stripe status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
