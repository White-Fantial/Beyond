import { type NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { retryPaymentAttempt } from "@/services/admin/admin-subscription.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; invoiceId: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { tenantId, invoiceId } = await params;
    const success = await retryPaymentAttempt(tenantId, invoiceId);
    if (!success) {
      return NextResponse.json(
        { error: "Retry failed or invoice not eligible" },
        { status: 422 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[payment-retry] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
