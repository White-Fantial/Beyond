import { NextRequest, NextResponse } from "next/server";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import {
  listProductModifierGroups,
  linkModifierGroupToProduct,
  unlinkModifierGroupFromProduct,
} from "@/services/owner/owner-tenant-modifiers.service";

interface Params {
  params: Promise<{ productId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { productId } = await params;
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const links = await listProductModifierGroups(tenantId, productId);
    return NextResponse.json({ data: links });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { productId } = await params;
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const body = await req.json();
    if (!body.tenantModifierGroupId) {
      return NextResponse.json({ error: "tenantModifierGroupId is required" }, { status: 400 });
    }
    const link = await linkModifierGroupToProduct(
      tenantId,
      productId,
      body.tenantModifierGroupId,
      ctx.userId,
      body.displayOrder
    );
    return NextResponse.json({ data: link }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { productId } = await params;
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const body = await req.json();
    if (!body.tenantModifierGroupId) {
      return NextResponse.json({ error: "tenantModifierGroupId is required" }, { status: 400 });
    }
    await unlinkModifierGroupFromProduct(
      tenantId,
      productId,
      body.tenantModifierGroupId,
      ctx.userId
    );
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
