import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listCredentials,
  createCredential,
} from "@/services/owner/owner-supplier-credentials.service";
import type { CreateCredentialInput } from "@/types/owner-supplier-credentials";

export async function GET() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const userId = ctx.userId;

  const items = await listCredentials(tenantId, userId);
  return NextResponse.json({ data: items });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const userId = ctx.userId;

  const body = (await req.json()) as CreateCredentialInput;

  if (!body.supplierId?.trim()) {
    return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
  }
  if (!body.username?.trim()) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }
  if (!body.password?.trim()) {
    return NextResponse.json({ error: "password is required" }, { status: 400 });
  }

  try {
    const credential = await createCredential(tenantId, userId, body);
    return NextResponse.json({ data: credential }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create credential";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
