/**
 * Types for Supplier Contract Prices and Price Records.
 *
 * SupplierContractPrice — per-owner negotiated price for a supplier product.
 * SupplierPriceRecord   — append-only observation history (scraped or manual).
 */

export type SupplierPriceSource = "SCRAPED" | "MANUAL_ENTRY" | "INVOICE_IMPORT";

/** An active or historical contracted price between a tenant and a supplier product. */
export interface SupplierContractPrice {
  id: string;
  supplierProductId: string;
  tenantId: string;
  /** Price in millicents (1/100000 dollar) */
  price: number;
  effectiveFrom: string;
  /** null means this is the currently active contract price */
  effectiveTo: string | null;
  contractRef: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A single price observation record (scraped or manually entered). */
export interface SupplierPriceRecord {
  id: string;
  supplierProductId: string;
  tenantId: string;
  /** Price in millicents (1/100000 dollar) */
  observedPrice: number;
  source: SupplierPriceSource;
  credentialId: string | null;
  observedAt: string;
  notes: string | null;
}

export interface CreateContractPriceInput {
  /** Price in millicents (1/100000 dollar) */
  price: number;
  effectiveFrom?: string;
  contractRef?: string;
  notes?: string;
}

export interface CreatePriceRecordInput {
  /** Price in millicents (1/100000 dollar) */
  observedPrice: number;
  source?: SupplierPriceSource;
  notes?: string;
}

export interface ContractPriceListResult {
  items: SupplierContractPrice[];
  total: number;
}

export interface PriceRecordListResult {
  items: SupplierPriceRecord[];
  total: number;
  page: number;
  pageSize: number;
}
