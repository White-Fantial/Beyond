import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  updateCustomerAddress,
  deleteCustomerAddress,
  CustomerAddressNotFoundError,
  CustomerAddressValidationError,
} from "@/services/customer.service";

interface Params {
  params: { addressId: string };
}

/**
 * PATCH /api/customer/addresses/[addressId]
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { addressId } = params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    await updateCustomerAddress(ctx.userId, addressId, body);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof CustomerAddressNotFoundError) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    if (err instanceof CustomerAddressValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[customer/addresses PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/customer/addresses/[addressId]
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { addressId } = params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    await deleteCustomerAddress(ctx.userId, addressId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof CustomerAddressNotFoundError) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    console.error("[customer/addresses DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
