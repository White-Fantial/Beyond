/**
 * GET /api/integrations/callback
 *
 * OAuth callback endpoint. The provider redirects here after the user
 * authorizes (or denies) access. Query params are provider-specific but
 * always include `state` (CSRF token).
 *
 * Supports: Loyverse, Lightspeed, Uber Eats, DoorDash
 *
 * On success: redirects to /owner/stores/[storeId]/integrations?connected=1
 * On failure: redirects to /owner/stores/[storeId]/integrations?error=<code>
 *
 * Note: The provider name is derived from the `state` lookup in the DB,
 * so a single callback route handles all providers.
 */

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleOAuthCallback } from "@/services/integration.service";
import type { ConnectionProvider } from "@prisma/client";

// Map URL slug → enum value
const PROVIDER_SLUG_MAP: Record<string, ConnectionProvider> = {
 loyverse: "LOYVERSE",
  lightspeed: "LIGHTSPEED",
  "uber-eats": "UBER_EATS",
  doordash: "DOORDASH",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerSlug } = await params;
  const provider = PROVIDER_SLUG_MAP[providerSlug];

  if (!provider) {
    return NextResponse.json(
      { error: `Unknown provider slug: ${providerSlug}` },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? undefined;
  const error = url.searchParams.get("error") ?? undefined;
  const errorDescription = url.searchParams.get("error_description") ?? undefined;

  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;

  // Validate state format before DB lookup (must be non-empty base64url string)
  const STATE_RE = /^[A-Za-z0-9_-]{16,}$/;
  const stateIsValid = STATE_RE.test(state);

  // Look up state to get storeId for redirect
  const oauthState =
    stateIsValid
      ? await prisma.connectionOAuthState.findUnique({ where: { state } })
      : null;

  const storeId = oauthState?.storeId ?? null;

  const fallbackRedirect = storeId
    ? `/owner/stores/${storeId}/integrations`
    : "/owner/integrations";

  try {
    const result = await handleOAuthCallback(
      provider,
      { state, code, error, errorDescription },
      appBaseUrl
    );

    const successUrl = `/owner/stores/${result.storeId}/integrations?connected=1&provider=${providerSlug}`;
    return NextResponse.redirect(new URL(successUrl, appBaseUrl));
  } catch (err) {
    const message = err instanceof Error ? err.message : "callback_failed";
    console.error(`[api/integrations/callback/${providerSlug}] Error:`, message);

    const errorSlug = error ?? "callback_failed";
    const redirectUrl = `${fallbackRedirect}?error=${encodeURIComponent(errorSlug)}`;
    return NextResponse.redirect(new URL(redirectUrl, appBaseUrl));
  }
}
