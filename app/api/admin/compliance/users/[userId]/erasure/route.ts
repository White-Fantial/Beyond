import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { anonymiseUser } from "@/services/admin/admin-compliance.service";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAuthContext } from "@/lib/auth/context";

export async function POST(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  await requirePlatformAdmin();
  const ctx = await getCurrentUserAuthContext();
  const performedBy = ctx?.userId ?? "system";

  // Record erasure request before processing
  await prisma.complianceEvent.create({
    data: {
      userId: params.userId,
      type: "ERASURE_REQUEST",
      performedBy,
    },
  });

  try {
    const result = await anonymiseUser(params.userId, performedBy);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erasure failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
