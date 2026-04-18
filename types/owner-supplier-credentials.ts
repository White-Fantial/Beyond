/**
 * Types for Supplier Credentials & Base Price (Cost Management Phase 5).
 */

export interface SupplierCredential {
  id: string;
  tenantId: string;
  userId: string;
  supplierId: string;
  supplierName: string;
  loginUrl: string | null;
  username: string;
  // passwordEnc is never returned to the client
  lastVerified: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCredentialInput {
  supplierId: string;
  loginUrl?: string;
  username: string;
  password: string;
}

export interface UpdateCredentialInput {
  loginUrl?: string | null;
  username?: string;
  password?: string;
  isActive?: boolean;
}

export interface VerifyCredentialResult {
  credentialId: string;
  success: boolean;
  verifiedAt: string | null;
  message: string;
}

export interface SupplierPriceObservation {
  id: string;
  supplierProductId: string;
  userId: string;
  credentialId: string;
  observedPrice: number;
  scrapedAt: string;
}

export interface UserScrapeResult {
  supplierProductId: string;
  supplierProductName: string;
  observedPrice: number;
  previousObservation: number | null;
  newBasePrice: number;
  scrapedAt: string;
}

export interface UserScrapeRunResult {
  userId: string;
  scraped: number;
  skipped: number;
  failed: number;
  results: UserScrapeResult[];
}

export interface BasePriceInfo {
  supplierProductId: string;
  basePrice: number;
  basePriceUpdatedAt: string | null;
  basePriceScrapedUserCount: number;
  observationCount: number;
}
