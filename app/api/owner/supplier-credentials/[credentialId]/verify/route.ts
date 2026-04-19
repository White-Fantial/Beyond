import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { verifyCredential } from "@/services/owner/owner-supplier-credentials.service";

interface Params {
  params: { credentialId: string };
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { credentialId } = params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const userId = ctx.userId;

  try {
    const result = await verifyCredential(tenantId, userId, credentialId);
    const status = result.success ? 200 : 422;
    return NextResponse.json({ data: result }, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
