import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { listApplications } from "@/services/provider/provider-onboarding.service";
import type { ProviderApplicationStatus } from "@/types/provider-onboarding";

export async function GET(req: NextRequest) {
  await requirePlatformAdminNotImpersonating();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as ProviderApplicationStatus | null;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

  const result = await listApplications({ status: status ?? undefined, page, pageSize });
  return NextResponse.json({ data: result });
}
