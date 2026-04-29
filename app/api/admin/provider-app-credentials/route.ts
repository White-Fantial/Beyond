import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import {
  listProviderAppCredentials,
  createProviderAppCredential,
} from "@/services/admin/admin-provider-credentials.service";

export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const { searchParams } = req.nextUrl;
    const result = await listProviderAppCredentials({
      provider: searchParams.get("provider") ?? undefined,
      environment: searchParams.get("environment") ?? undefined,
      isActive: searchParams.get("isActive") ?? undefined,
      page: searchParams.get("page") ?? 1,
      pageSize: searchParams.get("pageSize") ?? 20,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdminNotImpersonating();
    const body = await req.json();
    const { provider, environment, displayName, authScheme, tenantId, clientId, keyId, developerId, scopes, clientSecret, webhookSecret } = body;

    if (!provider || !displayName || !authScheme) {
      return NextResponse.json(
        { error: "provider, displayName, and authScheme are required." },
        { status: 400 }
      );
    }

    const result = await createProviderAppCredential({
      provider,
      environment: environment ?? "PRODUCTION",
      displayName,
      authScheme,
      tenantId: tenantId || null,
      clientId: clientId || null,
      keyId: keyId || null,
      developerId: developerId || null,
      scopes: Array.isArray(scopes) ? scopes : [],
      clientSecret: clientSecret || null,
      webhookSecret: webhookSecret || null,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.startsWith("impersonation_active")) {
      return NextResponse.json({ error: "Exit impersonation before performing admin write actions." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
