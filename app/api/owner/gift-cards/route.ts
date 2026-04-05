import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { listGiftCards, issueGiftCard } from "@/services/owner/owner-gift-cards.service";
import type { IssueGiftCardInput } from "@/types/owner-gift-cards";

export async function GET(req: NextRequest) {
  const ctx = await requireAuth();
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  const storeId = searchParams.get("storeId") ?? undefined;
  const isVoidedParam = searchParams.get("isVoided");
  const isVoided = isVoidedParam === "true" ? true : isVoidedParam === "false" ? false : undefined;

  const result = await listGiftCards(ctx.tenantId, { storeId, isVoided, page, pageSize });
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const body = (await req.json()) as IssueGiftCardInput;

  if (!body.initialValue || body.initialValue <= 0) {
    return NextResponse.json({ error: "initialValue must be a positive integer (minor units)" }, { status: 400 });
  }

  const card = await issueGiftCard(ctx.tenantId, body);
  return NextResponse.json({ data: card }, { status: 201 });
}
