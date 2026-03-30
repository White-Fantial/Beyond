import { NextRequest, NextResponse } from "next/server";
import { listModifierGroups, setModifierOptionSoldOut } from "@/services/catalog.service";

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  const activeOnly = req.nextUrl.searchParams.get("activeOnly") !== "false";
  const groups = await listModifierGroups(storeId, { activeOnly });
  return NextResponse.json({ modifierGroups: groups });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { action, optionId, isSoldOut } = body as {
    action: "toggleSoldOut";
    optionId: string;
    isSoldOut: boolean;
  };

  if (action === "toggleSoldOut") {
    if (!optionId || isSoldOut === undefined) {
      return NextResponse.json({ error: "optionId and isSoldOut required" }, { status: 400 });
    }
    const updated = await setModifierOptionSoldOut(optionId, isSoldOut);
    return NextResponse.json({ option: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
