import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import {
  getProviderAppCredential,
  updateProviderAppCredential,
} from "@/services/admin/admin-provider-credentials.service";

interface Params {
  params: Promise<{ credentialId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requirePlatformAdmin();
    const { credentialId } = await params;
    const detail = await getProviderAppCredential(credentialId);
    return NextResponse.json(detail);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("No ProviderAppCredential") || message.includes("not found")) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requirePlatformAdminNotImpersonating();
    const { credentialId } = await params;
    const body = await req.json();

    await updateProviderAppCredential(credentialId, {
      displayName: body.displayName,
      isActive: body.isActive,
      clientId: body.clientId,
      keyId: body.keyId,
      developerId: body.developerId,
      scopes: body.scopes,
      clientSecret: body.clientSecret,
      webhookSecret: body.webhookSecret,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.startsWith("impersonation_active")) {
      return NextResponse.json({ error: "Exit impersonation before performing admin write actions." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
