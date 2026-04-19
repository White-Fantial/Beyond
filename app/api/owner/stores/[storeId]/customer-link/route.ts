import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ storeId: string }>;
}

/**
 * GET /api/owner/stores/[storeId]/customer-link
 *
 * Returns the branded customer-app URL for a given store. Owners use this to
 * generate QR codes, print on receipts, or embed in email templates.
 *
 * Response:
 *   {
 *     link: string;          // Full URL: https://<host>/<tenantSlug>/app?s=<storeCode>
 *     tenantSlug: string;
 *     storeCode: string;
 *     storeName: string;
 *     isCustomerFacing: boolean;
 *   }
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  try {
    await requireOwnerStoreAccess(storeId);

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        code: true,
        name: true,
        isCustomerFacing: true,
        tenant: { select: { slug: true } },
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
    const link = `${baseUrl}/${store.tenant.slug}/app?s=${store.code}`;

    return NextResponse.json({
      link,
      tenantSlug: store.tenant.slug,
      storeCode: store.code,
      storeName: store.name,
      isCustomerFacing: store.isCustomerFacing,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

/**
 * PATCH /api/owner/stores/[storeId]/customer-link
 *
 * Toggles the `isCustomerFacing` flag on the store.
 * Body: { isCustomerFacing: boolean }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  try {
    await requireOwnerStoreAccess(storeId);

    const body = await req.json().catch(() => null);
    if (typeof body?.isCustomerFacing !== "boolean") {
      return NextResponse.json(
        { error: "isCustomerFacing (boolean) is required" },
        { status: 400 }
      );
    }

    await prisma.store.update({
      where: { id: storeId },
      data: { isCustomerFacing: body.isCustomerFacing },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
