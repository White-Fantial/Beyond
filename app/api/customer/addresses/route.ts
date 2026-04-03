import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  listCustomerAddresses,
  createCustomerAddress,
  CustomerAddressValidationError,
} from "@/services/customer.service";

/**
 * GET /api/customer/addresses
 */
export async function GET() {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const addresses = await listCustomerAddresses(ctx.userId);
  return NextResponse.json({ data: addresses });
}

/**
 * POST /api/customer/addresses
 * Body: { label?, line1, line2?, city, region?, postalCode?, country? }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const address = await createCustomerAddress(ctx.userId, body);
    return NextResponse.json({ data: address }, { status: 201 });
  } catch (err) {
    if (err instanceof CustomerAddressValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[customer/addresses POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
