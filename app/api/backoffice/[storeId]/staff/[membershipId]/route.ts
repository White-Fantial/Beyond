import { NextRequest, NextResponse } from "next/server";
import { requireStoreAccess } from "@/lib/auth/permissions";
import { updateStaffMember } from "@/services/backoffice/backoffice-staff.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { storeId: string; membershipId: string } }
) {
  try {
    const { storeId, membershipId } = params;
    await requireStoreAccess(storeId);
    const body = await req.json();
    const updated = await updateStaffMember(storeId, membershipId, body);
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[backoffice/staff PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
