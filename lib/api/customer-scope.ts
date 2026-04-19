/**
 * Shared helpers for Customer API route handlers.
 */
import type { NextRequest } from "next/server";
import { CUSTOMER_STORE_COOKIE } from "@/lib/customer-store-context";
import { prisma } from "@/lib/prisma";

/**
 * Reads the `beyond_store_ctx` cookie from the request and resolves it to a
 * `{ tenantId, storeId }` scope object.
 * Returns `undefined` when no valid cookie is present.
 */
export async function resolveScopeFromCookie(
  req: NextRequest
): Promise<{ tenantId: string; storeId: string } | undefined> {
  const cookieStoreId = req.cookies.get(CUSTOMER_STORE_COOKIE)?.value;
  if (!cookieStoreId) return undefined;

  const store = await prisma.store.findFirst({
    where: { id: cookieStoreId, status: { not: "ARCHIVED" } },
    select: { tenantId: true },
  });

  if (!store) return undefined;
  return { tenantId: store.tenantId, storeId: cookieStoreId };
}
