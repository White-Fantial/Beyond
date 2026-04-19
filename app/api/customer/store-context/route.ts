import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  CUSTOMER_STORE_COOKIE,
  CUSTOMER_STORE_COOKIE_MAX_AGE,
  saveCustomerPreferredStore,
} from "@/lib/customer-store-context";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/customer/store-context
 * Returns the current store context for the authenticated customer (from cookie).
 */
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const storeId = req.cookies.get(CUSTOMER_STORE_COOKIE)?.value;
  if (!storeId) return NextResponse.json({ storeContext: null });

  const store = await prisma.store.findFirst({
    where: { id: storeId, status: { not: "ARCHIVED" } },
    select: {
      id: true,
      code: true,
      name: true,
      tenantId: true,
      tenant: { select: { slug: true, displayName: true } },
    },
  });

  if (!store) return NextResponse.json({ storeContext: null });

  return NextResponse.json({
    storeContext: {
      storeId: store.id,
      storeCode: store.code,
      storeName: store.name,
      tenantId: store.tenantId,
      tenantSlug: store.tenant.slug,
      tenantName: store.tenant.displayName,
    },
  });
}

/**
 * POST /api/customer/store-context
 * Body: { storeId: string }
 * Sets the `beyond_store_ctx` cookie and persists preference in DB.
 */
export async function POST(req: NextRequest) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const storeId = typeof body?.storeId === "string" ? body.storeId : null;

  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  // Verify the store exists and is customer-facing
  const store = await prisma.store.findFirst({
    where: { id: storeId, isCustomerFacing: true, status: { not: "ARCHIVED" } },
    select: { tenantId: true },
  });

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Persist preferred store in DB for cross-device support
  await saveCustomerPreferredStore(ctx.email, store.tenantId, storeId);

  const res = NextResponse.json({ success: true });
  res.cookies.set(CUSTOMER_STORE_COOKIE, storeId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_STORE_COOKIE_MAX_AGE,
  });
  return res;
}

/**
 * DELETE /api/customer/store-context
 * Clears the store context cookie (e.g. when switching tenants).
 */
export async function DELETE() {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const res = NextResponse.json({ success: true });
  res.cookies.delete(CUSTOMER_STORE_COOKIE);
  return res;
}
