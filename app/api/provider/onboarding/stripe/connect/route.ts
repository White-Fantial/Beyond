import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { createOnboardingLink } from "@/lib/stripe/connect";

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();

  if (!ctx.isRecipeProvider && !ctx.isPlatformAdmin) {
    return NextResponse.json({ error: "Not a recipe provider" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    returnUrl?: string;
    refreshUrl?: string;
  };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const returnUrl = body.returnUrl ?? `${baseUrl}/provider/onboarding?step=complete`;
  const refreshUrl = body.refreshUrl ?? `${baseUrl}/provider/onboarding/stripe/refresh`;

  try {
    const { url, accountId } = await createOnboardingLink(
      ctx.userId,
      ctx.email,
      returnUrl,
      refreshUrl
    );
    return NextResponse.json({ data: { url, accountId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create Stripe link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
