import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { deleteCustomerReview } from "@/services/customer-reviews.service";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const { reviewId } = params;
    const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
    await deleteCustomerReview(ctx.userId, reviewId);
    return NextResponse.json({ data: null });
  } catch (err) {
    console.error("[customer/reviews/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
