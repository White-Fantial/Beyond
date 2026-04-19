import { NextRequest, NextResponse } from "next/server";
import { requireStoreAccess } from "@/lib/auth/permissions";
import { getScheduleData } from "@/services/backoffice/backoffice-staff.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { storeId } = params;
    await requireStoreAccess(storeId);
    const data = await getScheduleData(storeId);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[backoffice/schedule GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
