import { NextRequest, NextResponse } from "next/server";
import { requireStoreAccess } from "@/lib/auth/permissions";
import { listStaffMembers } from "@/services/backoffice/backoffice-staff.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    await requireStoreAccess(storeId);
    const data = await listStaffMembers(storeId);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[backoffice/staff GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
