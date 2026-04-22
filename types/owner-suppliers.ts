import type { IngredientUnit } from "./owner-ingredients";

export type SupplierScope = "PLATFORM" | "STORE";

export interface Supplier {
  id: string;
  scope: SupplierScope;
  tenantId: string | null;
  storeId: string | null;
  name: string;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  name: string;
  externalUrl: string | null;
  /** Platform-wide aggregate reference price (max across all tenants), maintained by scraper. */
  referencePrice: number; // millicents (1/100000 dollar)
  unit: IngredientUnit;
  lastScrapedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientSupplierLink {
  id: string;
  ingredientId: string;
  supplierProductId: string;
  supplierProductName: string;
  supplierName: string;
  /** null = platform-level link; set = owner-specific override */
  tenantId: string | null;
  isPreferred: boolean;
  /** Current reference price in millicents for display */
  referencePrice: number;
  lastScrapedAt: string | null;
  createdAt: string;
}

export interface SupplierDetail extends Omit<Supplier, "productCount"> {
  products: SupplierProduct[];
}

export interface SupplierListResult {
  items: Supplier[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateSupplierInput {
  storeId: string;
  name: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export interface CreatePlatformSupplierInput {
  name: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
}

export interface UpsertSupplierProductInput {
  name: string;
  externalUrl?: string;
  referencePrice?: number; // millicents (1/100000 dollar)
  unit: IngredientUnit;
}

export interface UpdateSupplierProductInput {
  name?: string;
  externalUrl?: string | null;
  referencePrice?: number; // millicents (1/100000 dollar)
  unit?: IngredientUnit;
}

export interface SupplierFilters {
  storeId?: string;
  page?: number;
  pageSize?: number;
}

export interface ScrapeResult {
  supplierProductId: string;
  previousPrice: number;
  newPrice: number;
  changed: boolean;
  scrapedAt: string;
}

// ─── SupplierRequest ──────────────────────────────────────────────────────────

export type SupplierRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "DUPLICATE";

export const SUPPLIER_REQUEST_STATUS_LABELS: Record<
  SupplierRequestStatus,
  string
> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DUPLICATE: "Duplicate",
};

export interface SupplierRequest {
  id: string;
  requestedByUserId: string;
  requestedByName: string;
  tenantId: string;
  name: string;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  status: SupplierRequestStatus;
  resolvedSupplierId: string | null;
  reviewedByUserId: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierRequestListResult {
  items: SupplierRequest[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateSupplierRequestInput {
  name: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export interface ReviewSupplierRequestInput {
  status: "APPROVED" | "REJECTED" | "DUPLICATE";
  /** Required when status is APPROVED or DUPLICATE — the Supplier id (scope=PLATFORM) to link. */
  resolvedSupplierId?: string;
  reviewNotes?: string;
}

export interface SupplierRequestFilters {
  status?: SupplierRequestStatus;
  tenantId?: string;
  page?: number;
  pageSize?: number;
}

