import { NextRequest, NextResponse } from "next/server";
import { listModifierGroups, setModifierOptionSoldOut, setModifierOptionActive } from "@/services/catalog.service";

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
  const { action, optionId, isSoldOut, isActive } = body as {
    action: "toggleSoldOut" | "toggleActive";
    optionId: string;
    isSoldOut?: boolean;
    isActive?: boolean;
  };

  if (action === "toggleSoldOut") {
    if (!optionId || isSoldOut === undefined) {
      return NextResponse.json({ error: "optionId and isSoldOut required" }, { status: 400 });
    }
    const updated = await setModifierOptionSoldOut(optionId, isSoldOut);
    return NextResponse.json({ option: updated });
  }

  if (action === "toggleActive") {
    if (!optionId || isActive === undefined) {
      return NextResponse.json({ error: "optionId and isActive required" }, { status: 400 });
    }
    const updated = await setModifierOptionActive(optionId, isActive);
    return NextResponse.json({ option: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
