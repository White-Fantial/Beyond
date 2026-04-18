import type { IngredientUnit } from "./owner-ingredients";

export interface Supplier {
  id: string;
  tenantId: string;
  storeId: string;
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
  currentPrice: number; // minor currency units
  basePrice: number; // max across all user observations
  basePriceUpdatedAt: string | null;
  basePriceScrapedUserCount: number;
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
  isPreferred: boolean;
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
  currentPrice: number;
  unit: IngredientUnit;
}

export interface UpdateSupplierProductInput {
  name?: string;
  externalUrl?: string | null;
  currentPrice?: number;
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
