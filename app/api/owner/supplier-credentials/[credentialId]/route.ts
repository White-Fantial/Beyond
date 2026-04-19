import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  updateCredential,
  deleteCredential,
} from "@/services/owner/owner-supplier-credentials.service";
import type { UpdateCredentialInput } from "@/types/owner-supplier-credentials";

interface Params {
  params: { credentialId: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { credentialId } = params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const userId = ctx.userId;

  const body = (await req.json()) as UpdateCredentialInput;

  try {
    const credential = await updateCredential(tenantId, userId, credentialId, body);
    return NextResponse.json({ data: credential });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update credential";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { credentialId } = params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const userId = ctx.userId;

  try {
    await deleteCredential(tenantId, userId, credentialId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete credential";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
