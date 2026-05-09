import type { IngredientUnit } from "./owner-ingredients";

export type OwnerInvoiceImportBatchStatus =
  | "DRAFT"
  | "PREVIEWED"
  | "APPLIED"
  | "PARTIALLY_APPLIED"
  | "FAILED";

export type OwnerInvoiceImportRowStatus =
  | "MATCHED"
  | "PRODUCT_ONLY"
  | "PLATFORM_CANDIDATE"
  | "UNMATCHED"
  | "INCOMPLETE";

export type OwnerInvoiceImportRowApplyStatus =
  | "PENDING"
  | "APPLIED"
  | "FAILED"
  | "SKIPPED";

export interface OwnerInvoiceImportBatch {
  id: string;
  tenantId: string;
  userId: string;
  supplierId: string;
  sourceFileName: string;
  sourceFileMime: string | null;
  sourceFileSize: number;
  status: OwnerInvoiceImportBatchStatus;
  extractionNote: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerInvoiceImportRow {
  id: string;
  batchId: string;
  rowNumber: number;
  rawLine: string | null;
  detectedName: string | null;
  detectedSku: string | null;
  detectedQuantity: number | null;
  detectedUnit: IngredientUnit | null;
  detectedPrice: number | null;
  rowStatus: OwnerInvoiceImportRowStatus;
  confidence: number;
  matchReason: string | null;
  supplierProductId: string | null;
  ingredientId: string | null;
  platformIngredientId: string | null;
  needsOwnerIngredientImport: boolean;
  createProvisionalIngredient: boolean;
  provisionalIngredientName: string | null;
  applyStatus: OwnerInvoiceImportRowApplyStatus;
  applyError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerInvoiceImportOption {
  id: string;
  name: string;
}

export interface OwnerInvoiceImportProductOption extends OwnerInvoiceImportOption {
  unit: IngredientUnit;
  referencePrice: number;
}

export interface OwnerInvoiceImportDetail {
  batch: OwnerInvoiceImportBatch;
  rows: OwnerInvoiceImportRow[];
  supplierProducts: OwnerInvoiceImportProductOption[];
  activeIngredients: OwnerInvoiceImportOption[];
  platformIngredients: OwnerInvoiceImportOption[];
}

export interface CreateOwnerInvoiceImportInput {
  supplierId: string;
  fileName: string;
  fileMimeType: string | null;
  fileSize: number;
  fileBuffer: Buffer;
}

export interface UpdateOwnerInvoiceImportRowInput {
  detectedName?: string | null;
  detectedSku?: string | null;
  detectedQuantity?: number | null;
  detectedUnit?: IngredientUnit | null;
  detectedPrice?: number | null;
  supplierProductId?: string | null;
  ingredientId?: string | null;
  platformIngredientId?: string | null;
  createProvisionalIngredient?: boolean;
  provisionalIngredientName?: string | null;
}

export interface ApplyOwnerInvoiceImportResult {
  batchId: string;
  status: OwnerInvoiceImportBatchStatus;
  appliedCount: number;
  failedCount: number;
  skippedCount: number;
}
