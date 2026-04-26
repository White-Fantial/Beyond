import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { parseCsv, rowToObject } from "@/lib/import/csv-import";
import { importPlatformSupplierProducts } from "@/services/admin/admin-suppliers.service";
import type { IngredientUnit } from "@/types/owner-ingredients";

interface RouteContext {
  params: Promise<{ supplierId: string }>;
}

const VALID_UNITS = new Set<IngredientUnit>([
  "GRAM",
  "KG",
  "ML",
  "LITER",
  "EACH",
  "TSP",
  "TBSP",
  "OZ",
  "LB",
  "CUP",
  "PIECE",
]);

function parsePriceToMillicents(value: string): number {
  const numeric = Number(value.replace(/[$,]/g, ""));
  if (!Number.isFinite(numeric) || numeric < 0) throw new Error("referencePrice must be a non-negative number");
  return Math.round(numeric * 100000);
}

function parsePurchaseQty(value: string): number {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("purchaseQty must be greater than zero");
  return qty;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { supplierId } = await params;
  const formData = await req.formData();

  const csvTextInput = String(formData.get("csvText") ?? "").trim();
  const csvFile = formData.get("csvFile");

  let rawCsv = csvTextInput;
  if (!rawCsv && csvFile instanceof File) {
    rawCsv = (await csvFile.text()).trim();
  }

  if (!rawCsv) {
    return NextResponse.json(
      { error: "Provide CSV content either as file upload or text." },
      { status: 400 }
    );
  }

  try {
    const rows = parseCsv(rawCsv);
    if (rows.length < 2) {
      return NextResponse.json(
        { error: "CSV must include a header row and at least one data row." },
        { status: 400 }
      );
    }

    const [headerRow, ...dataRows] = rows;
    const headers = headerRow.map((header) => header.trim().toLowerCase());

    const requiredHeaders = ["name", "referenceprice", "purchaseqty", "unit"];
    for (const requiredHeader of requiredHeaders) {
      if (!headers.includes(requiredHeader)) {
        return NextResponse.json(
          { error: `Missing required CSV header: ${requiredHeader}` },
          { status: 400 }
        );
      }
    }

    const payload = dataRows.map((row, index) => {
      const entry = rowToObject(headerRow, row);
      const unit = entry.unit?.toUpperCase() as IngredientUnit;
      if (!VALID_UNITS.has(unit)) {
        throw new Error(`Row ${index + 2}: unit must be one of ${[...VALID_UNITS].join(", ")}`);
      }

      return {
        name: entry.name ?? "",
        externalUrl: entry.externalurl || undefined,
        referencePrice: parsePriceToMillicents(entry.referenceprice ?? ""),
        purchaseQty: parsePurchaseQty(entry.purchaseqty ?? ""),
        unit,
      };
    });

    const result = await importPlatformSupplierProducts(supplierId, payload);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
