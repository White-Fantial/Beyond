import { prisma } from "@/lib/prisma";
import type { IngredientUnit } from "@/types/owner-ingredients";
import type {
  ApplyOwnerInvoiceImportResult,
  CreateOwnerInvoiceImportInput,
  OwnerInvoiceImportBatch,
  OwnerInvoiceImportDetail,
  OwnerInvoiceImportOption,
  OwnerInvoiceImportProductOption,
  OwnerInvoiceImportRow,
  OwnerInvoiceImportRowStatus,
  UpdateOwnerInvoiceImportRowInput,
} from "@/types/owner-invoice-imports";

const INGREDIENT_UNITS: IngredientUnit[] = [
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
];

const INVOICE_UNIT_TOKEN_PATTERN =
  "(KG|GRAM|G|ML|L|LITER|EACH|EA|PIECE|PCS|PC|LB|OZ|TSP|TBSP|CUP)";
const PLATFORM_INGREDIENT_LOOKUP_LIMIT = 1000;
const MATCH_CONFIDENCE = {
  SKU_EXACT: 96,
  NAME_EXACT: 90,
  NAME_FUZZY: 74,
  LINKED_SELECTED: 92,
  LINKED_NOT_SELECTED: 88,
  ACTIVE_NAME: 83,
  PLATFORM_NAME: 76,
} as const;

type ParsedInvoiceRow = {
  rawLine: string | null;
  detectedName: string | null;
  detectedSku: string | null;
  detectedQuantity: number | null;
  detectedUnit: IngredientUnit | null;
  detectedPrice: number | null;
};

type SupplierProductCandidate = {
  id: string;
  name: string;
  unit: IngredientUnit;
  referencePrice: number;
  metadata: unknown;
};

type IngredientCandidate = {
  id: string;
  name: string;
};

function normalizeText(input: string | null | undefined): string {
  return (input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseIngredientUnit(value: string | null | undefined): IngredientUnit | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "G") return "GRAM";
  if (normalized === "L") return "LITER";
  if (normalized === "EA" || normalized === "PCS") return "PIECE";
  if (normalized === "PC") return "PIECE";
  return INGREDIENT_UNITS.includes(normalized as IngredientUnit)
    ? (normalized as IngredientUnit)
    : null;
}

function parsePriceToMillicents(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[$,\s]/g, "");
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100000);
}

function parseQuantity(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function parseWithHeader(header: string[], row: string[]): ParsedInvoiceRow {
  const findIdx = (aliases: string[]) =>
    header.findIndex((h) => aliases.includes(normalizeText(h)));

  const nameIdx = findIdx(["name", "product", "item", "description"]);
  const skuIdx = findIdx(["sku", "code", "productcode", "itemcode"]);
  const qtyIdx = findIdx(["qty", "quantity", "purchaseqty"]);
  const unitIdx = findIdx(["unit", "uom"]);
  const priceIdx = findIdx(["price", "unitprice", "amount", "cost"]);

  return {
    rawLine: row.join(","),
    detectedName: nameIdx >= 0 ? row[nameIdx] || null : null,
    detectedSku: skuIdx >= 0 ? row[skuIdx] || null : null,
    detectedQuantity: qtyIdx >= 0 ? parseQuantity(row[qtyIdx]) : null,
    detectedUnit: unitIdx >= 0 ? parseIngredientUnit(row[unitIdx]) : null,
    detectedPrice: priceIdx >= 0 ? parsePriceToMillicents(row[priceIdx]) : null,
  };
}

function parseFreeTextLine(line: string): ParsedInvoiceRow {
  const unitRegex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${INVOICE_UNIT_TOKEN_PATTERN}\\b`, "i");
  const unitMatch = line.match(unitRegex);
  const quantity = unitMatch ? parseQuantity(unitMatch[1]) : null;
  const unit = unitMatch ? parseIngredientUnit(unitMatch[2]) : null;
  const skuMatch = line.match(/\bSKU[:#\s-]*([A-Z0-9\-]+)/i);
  const priceMatches = line.match(/\$?\d+(?:\.\d{1,2})?/g) ?? [];
  const detectedPrice =
    priceMatches.length > 0 ? parsePriceToMillicents(priceMatches[priceMatches.length - 1]) : null;
  const detectedName = line
    .replace(/\$?\d+(?:\.\d{1,2})?/g, "")
    .replace(/\bSKU[:#\s-]*[A-Z0-9\-]+\b/gi, "")
    .replace(new RegExp(`\\b\\d+(?:\\.\\d+)?\\s*${INVOICE_UNIT_TOKEN_PATTERN}\\b`, "gi"), "")
    .trim();

  return {
    rawLine: line,
    detectedName: detectedName || null,
    detectedSku: skuMatch?.[1] ?? null,
    detectedQuantity: quantity,
    detectedUnit: unit,
    detectedPrice,
  };
}

function parseInvoiceRows(fileName: string, fileMimeType: string | null, fileBuffer: Buffer): {
  rows: ParsedInvoiceRow[];
  extractionNote: string | null;
} {
  const lowerName = fileName.toLowerCase();
  const isTextLike =
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".tsv") ||
    (fileMimeType ?? "").includes("text");

  if (!isTextLike) {
    return {
      rows: [],
      extractionNote:
        "Automatic text extraction is not available for this file type yet. Please complete rows manually in preview.",
    };
  }

  const rawText = fileBuffer.toString("utf8").replace(/\u0000/g, "");
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], extractionNote: "No readable invoice lines were found in the uploaded file." };
  }

  const maybeHeader = parseCsvLine(lines[0]);
  const headerNormalized = maybeHeader.map((v) => normalizeText(v));
  const hasHeader = ["name", "product", "item"].some((key) => headerNormalized.includes(key));

  if (hasHeader) {
    const rows = lines
      .slice(1)
      .map((line) => parseWithHeader(maybeHeader, parseCsvLine(line)))
      .filter(
        (row) =>
          row.detectedName !== null ||
          row.detectedSku !== null ||
          row.detectedPrice !== null ||
          row.detectedQuantity !== null
      );
    return { rows, extractionNote: null };
  }

  return {
    rows: lines.map(parseFreeTextLine),
    extractionNote: null,
  };
}

function findProductCodeFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;
  const candidates = ["sku", "code", "productCode", "itemCode"];
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function findSupplierProductMatch(
  row: ParsedInvoiceRow,
  products: SupplierProductCandidate[]
): { productId: string | null; confidence: number; reason: string } {
  const skuNormalized = normalizeText(row.detectedSku);
  if (skuNormalized) {
    const skuMatch = products.find((product) => {
      const code = findProductCodeFromMetadata(product.metadata);
      return normalizeText(code) === skuNormalized;
    });
    if (skuMatch) {
      return {
        productId: skuMatch.id,
        confidence: MATCH_CONFIDENCE.SKU_EXACT,
        reason: "Matched supplier product by SKU/code.",
      };
    }
  }

  const nameNormalized = normalizeText(row.detectedName);
  if (!nameNormalized) {
    return { productId: null, confidence: 0, reason: "No product name detected." };
  }

  const exact = products.find((product) => normalizeText(product.name) === nameNormalized);
  if (exact) {
    return {
      productId: exact.id,
      confidence: MATCH_CONFIDENCE.NAME_EXACT,
      reason: "Matched supplier product by exact name.",
    };
  }

  const fuzzy = products.find((product) => {
    const productName = normalizeText(product.name);
    return productName.includes(nameNormalized) || nameNormalized.includes(productName);
  });
  if (fuzzy) {
    return {
      productId: fuzzy.id,
      confidence: MATCH_CONFIDENCE.NAME_FUZZY,
      reason: "Matched supplier product by normalized name similarity.",
    };
  }

  return { productId: null, confidence: 0, reason: "No supplier product match found." };
}

function toBatch(row: {
  id: string;
  tenantId: string;
  userId: string;
  supplierId: string;
  sourceFileName: string;
  sourceFileMime: string | null;
  sourceFileSize: number;
  status: string;
  extractionNote: string | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): OwnerInvoiceImportBatch {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    supplierId: row.supplierId,
    sourceFileName: row.sourceFileName,
    sourceFileMime: row.sourceFileMime,
    sourceFileSize: row.sourceFileSize,
    status: row.status as OwnerInvoiceImportBatch["status"],
    extractionNote: row.extractionNote,
    appliedAt: row.appliedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRow(row: {
  id: string;
  batchId: string;
  rowNumber: number;
  rawLine: string | null;
  detectedName: string | null;
  detectedSku: string | null;
  detectedQuantity: { toNumber(): number } | null;
  detectedUnit: string | null;
  detectedPrice: number | null;
  rowStatus: string;
  confidence: number;
  matchReason: string | null;
  supplierProductId: string | null;
  ingredientId: string | null;
  platformIngredientId: string | null;
  needsOwnerIngredientImport: boolean;
  createProvisionalIngredient: boolean;
  provisionalIngredientName: string | null;
  applyStatus: string;
  applyError: string | null;
  createdAt: Date;
  updatedAt: Date;
}): OwnerInvoiceImportRow {
  return {
    id: row.id,
    batchId: row.batchId,
    rowNumber: row.rowNumber,
    rawLine: row.rawLine,
    detectedName: row.detectedName,
    detectedSku: row.detectedSku,
    detectedQuantity: row.detectedQuantity?.toNumber() ?? null,
    detectedUnit: (row.detectedUnit as IngredientUnit | null) ?? null,
    detectedPrice: row.detectedPrice,
    rowStatus: row.rowStatus as OwnerInvoiceImportRow["rowStatus"],
    confidence: row.confidence,
    matchReason: row.matchReason,
    supplierProductId: row.supplierProductId,
    ingredientId: row.ingredientId,
    platformIngredientId: row.platformIngredientId,
    needsOwnerIngredientImport: row.needsOwnerIngredientImport,
    createProvisionalIngredient: row.createProvisionalIngredient,
    provisionalIngredientName: row.provisionalIngredientName,
    applyStatus: row.applyStatus as OwnerInvoiceImportRow["applyStatus"],
    applyError: row.applyError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function deriveRowStatus(input: {
  detectedName: string | null;
  detectedPrice: number | null;
  detectedQuantity: number | null;
  ingredientId: string | null;
  platformIngredientId: string | null;
  supplierProductId: string | null;
}): OwnerInvoiceImportRowStatus {
  if (!input.detectedName || input.detectedPrice === null || input.detectedQuantity === null) {
    return "INCOMPLETE";
  }
  if (input.ingredientId) return "MATCHED";
  if (input.platformIngredientId) return "PLATFORM_CANDIDATE";
  if (input.supplierProductId) return "PRODUCT_ONLY";
  return "UNMATCHED";
}

async function assertSupplierAccess(tenantId: string, supplierId: string): Promise<void> {
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      deletedAt: null,
      OR: [{ scope: "PLATFORM" }, { tenantId }],
    },
    select: { id: true },
  });
  if (!supplier) throw new Error("Supplier not found.");
}

export async function createOwnerInvoiceImport(
  tenantId: string,
  userId: string,
  input: CreateOwnerInvoiceImportInput
): Promise<OwnerInvoiceImportDetail> {
  await assertSupplierAccess(tenantId, input.supplierId);

  const [products, activeSelections, platformIngredients] = await Promise.all([
    prisma.supplierProduct.findMany({
      where: { supplierId: input.supplierId, deletedAt: null },
      select: { id: true, name: true, unit: true, referencePrice: true, metadata: true },
      orderBy: { name: "asc" },
    }),
    prisma.tenantIngredientSelection.findMany({
      where: { tenantId, isActive: true, ingredient: { deletedAt: null } },
      select: { ingredient: { select: { id: true, name: true } } },
      orderBy: { ingredient: { name: "asc" } },
    }),
    prisma.ingredient.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: PLATFORM_INGREDIENT_LOOKUP_LIMIT,
    }),
  ]);

  const productIds = products.map((product) => product.id);
  const links = await prisma.ingredientSupplierLink.findMany({
    where: {
      supplierProductId: { in: productIds.length > 0 ? productIds : [""] },
      OR: [{ tenantId }, { tenantId: null }],
    },
    select: {
      supplierProductId: true,
      tenantId: true,
      ingredientId: true,
      ingredient: { select: { id: true, name: true, deletedAt: true } },
    },
  });

  const parsed = parseInvoiceRows(
    input.fileName,
    input.fileMimeType,
    input.fileBuffer
  );
  const parsedRows = parsed.rows;

  const selectedIngredients = activeSelections.map((selection) => selection.ingredient);
  const selectedSet = new Set(selectedIngredients.map((ingredient) => ingredient.id));

  const linksByProduct = new Map<string, typeof links>();
  for (const link of links) {
    if (!link.ingredient || link.ingredient.deletedAt) continue;
    const existing = linksByProduct.get(link.supplierProductId) ?? [];
    existing.push(link);
    linksByProduct.set(link.supplierProductId, existing);
  }

  const rowsToCreate = parsedRows.map((row, index) => {
    const productMatch = findSupplierProductMatch(row, products);
    const productLinks = productMatch.productId
      ? linksByProduct.get(productMatch.productId) ?? []
      : [];

    let ingredientId: string | null = null;
    let platformIngredientId: string | null = null;
    let needsOwnerIngredientImport = false;
    let statusReason = productMatch.reason;
    let confidence = productMatch.confidence;

    if (productLinks.length > 0) {
      const tenantSpecific = productLinks.find((link) => link.tenantId === tenantId);
      const preferredLink = tenantSpecific ?? productLinks[0];
      if (preferredLink) {
        ingredientId = preferredLink.ingredientId;
        if (!selectedSet.has(preferredLink.ingredientId)) {
          platformIngredientId = preferredLink.ingredientId;
          ingredientId = null;
          needsOwnerIngredientImport = true;
          statusReason = "Matched supplier product link, but ingredient is not active for this owner.";
          confidence = Math.max(confidence, MATCH_CONFIDENCE.LINKED_NOT_SELECTED);
        } else {
          statusReason = "Matched supplier product and linked active ingredient.";
          confidence = Math.max(confidence, MATCH_CONFIDENCE.LINKED_SELECTED);
        }
      }
    } else if (row.detectedName) {
      const normalized = normalizeText(row.detectedName);
      const activeByName = selectedIngredients.find(
        (ingredient) => normalizeText(ingredient.name) === normalized
      );
      if (activeByName) {
        ingredientId = activeByName.id;
        statusReason = "Matched active ingredient by name.";
        confidence = Math.max(confidence, MATCH_CONFIDENCE.ACTIVE_NAME);
      } else {
        const platformByName = platformIngredients.find(
          (ingredient) => normalizeText(ingredient.name) === normalized
        );
        if (platformByName) {
          platformIngredientId = platformByName.id;
          needsOwnerIngredientImport = true;
          statusReason = "Matched platform ingredient by name, but owner has not activated it.";
          confidence = Math.max(confidence, MATCH_CONFIDENCE.PLATFORM_NAME);
        }
      }
    }

    const rowStatus = deriveRowStatus({
      detectedName: row.detectedName,
      detectedPrice: row.detectedPrice,
      detectedQuantity: row.detectedQuantity,
      ingredientId,
      platformIngredientId,
      supplierProductId: productMatch.productId,
    });

    return {
      rowNumber: index + 1,
      rawLine: row.rawLine,
      detectedName: row.detectedName,
      detectedSku: row.detectedSku,
      detectedQuantity: row.detectedQuantity,
      detectedUnit: row.detectedUnit,
      detectedPrice: row.detectedPrice,
      rowStatus,
      confidence,
      matchReason: statusReason,
      supplierProductId: productMatch.productId,
      ingredientId,
      platformIngredientId,
      needsOwnerIngredientImport,
      createProvisionalIngredient: false,
      provisionalIngredientName: null,
    };
  });

  const batch = await prisma.ownerInvoiceImportBatch.create({
    data: {
      tenantId,
      userId,
      supplierId: input.supplierId,
      sourceFileName: input.fileName,
      sourceFileMime: input.fileMimeType,
      sourceFileSize: input.fileSize,
      status: "PREVIEWED",
      extractionNote: parsed.extractionNote,
      rows: rowsToCreate.length > 0 ? { create: rowsToCreate } : undefined,
    },
    include: { rows: { orderBy: { rowNumber: "asc" } } },
  });

  const supplierProducts: OwnerInvoiceImportProductOption[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    unit: product.unit as IngredientUnit,
    referencePrice: product.referencePrice,
  }));
  const activeIngredientsOptions: OwnerInvoiceImportOption[] = selectedIngredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
  }));
  const platformIngredientsOptions: OwnerInvoiceImportOption[] = platformIngredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
  }));

  return {
    batch: toBatch(batch),
    rows: batch.rows.map(toRow),
    supplierProducts,
    activeIngredients: activeIngredientsOptions,
    platformIngredients: platformIngredientsOptions,
  };
}

export async function getOwnerInvoiceImportDetail(
  tenantId: string,
  batchId: string
): Promise<OwnerInvoiceImportDetail> {
  const batch = await prisma.ownerInvoiceImportBatch.findFirst({
    where: { id: batchId, tenantId },
    include: { rows: { orderBy: { rowNumber: "asc" } } },
  });
  if (!batch) throw new Error("Invoice import batch not found.");

  const [supplierProducts, activeSelections, platformIngredients] = await Promise.all([
    prisma.supplierProduct.findMany({
      where: { supplierId: batch.supplierId, deletedAt: null },
      select: { id: true, name: true, unit: true, referencePrice: true },
      orderBy: { name: "asc" },
    }),
    prisma.tenantIngredientSelection.findMany({
      where: { tenantId, isActive: true, ingredient: { deletedAt: null } },
      select: { ingredient: { select: { id: true, name: true } } },
      orderBy: { ingredient: { name: "asc" } },
    }),
    prisma.ingredient.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: PLATFORM_INGREDIENT_LOOKUP_LIMIT,
    }),
  ]);

  return {
    batch: toBatch(batch),
    rows: batch.rows.map(toRow),
    supplierProducts: supplierProducts.map((product) => ({
      id: product.id,
      name: product.name,
      unit: product.unit as IngredientUnit,
      referencePrice: product.referencePrice,
    })),
    activeIngredients: activeSelections.map((selection) => ({
      id: selection.ingredient.id,
      name: selection.ingredient.name,
    })),
    platformIngredients: platformIngredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
    })),
  };
}

export async function updateOwnerInvoiceImportRow(
  tenantId: string,
  batchId: string,
  rowId: string,
  input: UpdateOwnerInvoiceImportRowInput
): Promise<OwnerInvoiceImportRow> {
  const batch = await prisma.ownerInvoiceImportBatch.findFirst({
    where: { id: batchId, tenantId },
    select: { id: true },
  });
  if (!batch) throw new Error("Invoice import batch not found.");

  const row = await prisma.ownerInvoiceImportRow.findFirst({
    where: { id: rowId, batchId },
  });
  if (!row) throw new Error("Invoice import row not found.");

  const detectedName = input.detectedName === undefined ? row.detectedName : input.detectedName;
  const detectedPrice = input.detectedPrice === undefined ? row.detectedPrice : input.detectedPrice;
  const detectedQuantity =
    input.detectedQuantity === undefined
      ? row.detectedQuantity?.toNumber() ?? null
      : input.detectedQuantity;
  const supplierProductId =
    input.supplierProductId === undefined ? row.supplierProductId : input.supplierProductId;
  const ingredientId = input.ingredientId === undefined ? row.ingredientId : input.ingredientId;
  const platformIngredientId =
    input.platformIngredientId === undefined ? row.platformIngredientId : input.platformIngredientId;

  const rowStatus = deriveRowStatus({
    detectedName,
    detectedPrice,
    detectedQuantity,
    ingredientId,
    platformIngredientId,
    supplierProductId,
  });

  const updated = await prisma.ownerInvoiceImportRow.update({
    where: { id: row.id },
    data: {
      detectedName,
      detectedSku: input.detectedSku === undefined ? row.detectedSku : input.detectedSku,
      detectedQuantity,
      detectedUnit: input.detectedUnit === undefined ? row.detectedUnit : input.detectedUnit,
      detectedPrice,
      supplierProductId,
      ingredientId,
      platformIngredientId,
      createProvisionalIngredient:
        input.createProvisionalIngredient === undefined
          ? row.createProvisionalIngredient
          : input.createProvisionalIngredient,
      provisionalIngredientName:
        input.provisionalIngredientName === undefined
          ? row.provisionalIngredientName
          : input.provisionalIngredientName,
      needsOwnerIngredientImport: Boolean(platformIngredientId),
      rowStatus,
      applyStatus: "PENDING",
      applyError: null,
    },
  });

  return toRow(updated);
}

export async function addOwnerInvoiceImportManualRow(
  tenantId: string,
  batchId: string
): Promise<OwnerInvoiceImportRow> {
  const batch = await prisma.ownerInvoiceImportBatch.findFirst({
    where: { id: batchId, tenantId },
    select: { id: true },
  });
  if (!batch) throw new Error("Invoice import batch not found.");

  const maxRow = await prisma.ownerInvoiceImportRow.findFirst({
    where: { batchId },
    orderBy: { rowNumber: "desc" },
    select: { rowNumber: true },
  });
  const rowNumber = (maxRow?.rowNumber ?? 0) + 1;

  const row = await prisma.ownerInvoiceImportRow.create({
    data: {
      batchId,
      rowNumber,
      rowStatus: "INCOMPLETE",
      confidence: 0,
      matchReason: "Added manually.",
      applyStatus: "PENDING",
    },
  });
  return toRow(row);
}

async function resolveIngredientForApply(
  tenantId: string,
  row: {
    ingredientId: string | null;
    platformIngredientId: string | null;
    createProvisionalIngredient: boolean;
    provisionalIngredientName: string | null;
  },
  tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">
): Promise<string | null> {
  if (row.ingredientId) return row.ingredientId;

  if (row.platformIngredientId) {
    const platformIngredient = await tx.ingredient.findFirst({
      where: { id: row.platformIngredientId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!platformIngredient) return null;
    await tx.tenantIngredientSelection.upsert({
      where: {
        tenantId_ingredientId: {
          tenantId,
          ingredientId: platformIngredient.id,
        },
      },
      create: { tenantId, ingredientId: platformIngredient.id, isActive: true },
      update: { isActive: true },
    });
    return platformIngredient.id;
  }

  if (row.createProvisionalIngredient && row.provisionalIngredientName?.trim()) {
    const provisional = await tx.ingredient.create({
      data: {
        name: row.provisionalIngredientName.trim(),
        category: null,
        notes: "Auto-created provisional ingredient from owner invoice import review.",
        unit: "EACH",
        isActive: true,
      },
      select: { id: true },
    });
    await tx.tenantIngredientSelection.create({
      data: {
        tenantId,
        ingredientId: provisional.id,
        isActive: true,
      },
    });
    return provisional.id;
  }

  return null;
}

export async function applyOwnerInvoiceImport(
  tenantId: string,
  batchId: string
): Promise<ApplyOwnerInvoiceImportResult> {
  const batch = await prisma.ownerInvoiceImportBatch.findFirst({
    where: { id: batchId, tenantId },
    include: { rows: { orderBy: { rowNumber: "asc" } } },
  });
  if (!batch) throw new Error("Invoice import batch not found.");

  let appliedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const row of batch.rows) {
    const supplierProductId = row.supplierProductId;
    const detectedPrice = row.detectedPrice;
    if (!supplierProductId || detectedPrice === null || detectedPrice <= 0) {
      await prisma.ownerInvoiceImportRow.update({
        where: { id: row.id },
        data: {
          applyStatus: "SKIPPED",
          applyError: "Missing supplier product or price.",
        },
      });
      skippedCount += 1;
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const product = await tx.supplierProduct.findFirst({
          where: {
            id: supplierProductId,
            supplierId: batch.supplierId,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (!product) {
          throw new Error("Selected supplier product is not valid for this supplier.");
        }

        const ingredientId = await resolveIngredientForApply(tenantId, row, tx);
        if (!ingredientId) {
          throw new Error("Ingredient is required to apply price updates.");
        }

        await tx.tenantIngredientSelection.upsert({
          where: {
            tenantId_ingredientId: {
              tenantId,
              ingredientId,
            },
          },
          create: { tenantId, ingredientId, isActive: true },
          update: { isActive: true },
        });

        const existingLink = await tx.ingredientSupplierLink.findFirst({
          where: {
            ingredientId,
            supplierProductId,
            OR: [{ tenantId }, { tenantId: null }],
          },
          select: { id: true },
        });
        if (!existingLink) {
          await tx.ingredientSupplierLink.create({
            data: {
              ingredientId,
              supplierProductId,
              tenantId,
              isPreferred: false,
            },
          });
        }

        await tx.supplierPriceRecord.create({
          data: {
            supplierProductId,
            tenantId,
            observedPrice: detectedPrice,
            source: "INVOICE_IMPORT",
            observedAt: new Date(),
            notes: `Invoice import "${batch.sourceFileName}" (batch ${batch.id}), row ${row.rowNumber}`,
          },
        });

        await tx.ownerInvoiceImportRow.update({
          where: { id: row.id },
          data: {
            ingredientId,
            applyStatus: "APPLIED",
            applyError: null,
          },
        });
      });
      appliedCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to apply row.";
      await prisma.ownerInvoiceImportRow.update({
        where: { id: row.id },
        data: {
          applyStatus: "FAILED",
          applyError: message,
        },
      });
      failedCount += 1;
    }
  }

  const status =
    failedCount === 0
      ? "APPLIED"
      : appliedCount > 0
        ? "PARTIALLY_APPLIED"
        : "FAILED";

  await prisma.ownerInvoiceImportBatch.update({
    where: { id: batch.id },
    data: {
      status,
      appliedAt: appliedCount > 0 ? new Date() : null,
    },
  });

  return {
    batchId: batch.id,
    status,
    appliedCount,
    failedCount,
    skippedCount,
  };
}
