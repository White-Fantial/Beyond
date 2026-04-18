import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { applyForProvider, getUserApplication } from "@/services/provider/provider-onboarding.service";
import type { ApplyForProviderInput } from "@/types/provider-onboarding";

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();

  const body = (await req.json().catch(() => ({}))) as ApplyForProviderInput;
  if (!body.businessName?.trim()) {
    return NextResponse.json({ error: "businessName is required" }, { status: 400 });
  }

  try {
    const application = await applyForProvider(ctx.userId, body);
    return NextResponse.json({ data: application }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit application";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function GET() {
  const ctx = await requireAuth();
  const application = await getUserApplication(ctx.userId);
  return NextResponse.json({ data: application });
}
