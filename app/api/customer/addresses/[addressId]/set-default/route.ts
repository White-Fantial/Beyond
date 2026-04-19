import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  setDefaultCustomerAddress,
  CustomerAddressNotFoundError,
} from "@/services/customer.service";

interface Params {
  params: Promise<{ addressId: string }>;
}

/**
 * PATCH /api/customer/addresses/[addressId]/set-default
 */
export async function PATCH(_req: NextRequest, { params }: Params) {
  const { addressId } = await params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    await setDefaultCustomerAddress(ctx.userId, addressId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof CustomerAddressNotFoundError) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    console.error("[customer/addresses/set-default]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
