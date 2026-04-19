import { NextRequest, NextResponse } from "next/server";
import {
  getStoreBySlugForCustomer,
  enrollGuestSubscription,
} from "@/services/customer-menu.service";

const FREQUENCIES = ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /api/store/[storeSlug]/subscriptions
 *
 * Enrolls a guest in a subscription plan. No authentication required.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { storeSlug: string } }
) {
  const { storeSlug } = params;
  try {
    const store = await getStoreBySlugForCustomer(storeSlug);
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!body.planId || typeof body.planId !== "string") {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }
    if (!body.customerName || typeof body.customerName !== "string") {
      return NextResponse.json({ error: "customerName is required" }, { status: 400 });
    }
    if (!body.customerPhone || typeof body.customerPhone !== "string") {
      return NextResponse.json({ error: "customerPhone is required" }, { status: 400 });
    }
    if (!body.customerEmail || typeof body.customerEmail !== "string" || !body.customerEmail.includes("@")) {
      return NextResponse.json({ error: "customerEmail is required and must be valid" }, { status: 400 });
    }
    if (!body.frequency || !FREQUENCIES.includes(body.frequency)) {
      return NextResponse.json({ error: "frequency must be WEEKLY, BIWEEKLY, or MONTHLY" }, { status: 400 });
    }
    if (!body.startDate || !DATE_RE.test(body.startDate)) {
      return NextResponse.json({ error: "startDate must be in YYYY-MM-DD format" }, { status: 400 });
    }

    const result = await enrollGuestSubscription({
      storeId: store.id,
      planId: body.planId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      frequency: body.frequency,
      startDate: body.startDate,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      currencyCode: typeof body.currencyCode === "string" ? body.currencyCode : store.currency,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("does not belong") || message.includes("No SubscriptionPlan")) {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    console.error("[store/subscriptions] Unexpected error:", err);
    return NextResponse.json({ error: "Enrollment failed" }, { status: 500 });
  }
}
