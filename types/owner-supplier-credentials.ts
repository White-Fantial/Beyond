/**
 * Types for Supplier Credentials & Price Records (Cost Management Phase 5+).
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

export interface UserScrapeResult {
  supplierProductId: string;
  supplierProductName: string;
  observedPrice: number;
  previousObservedPrice: number | null;
  newReferencePrice: number;
  scrapedAt: string;
}

export interface UserScrapeRunResult {
  userId: string;
  scraped: number;
  skipped: number;
  failed: number;
  results: UserScrapeResult[];
}

export interface ReferencePriceInfo {
  supplierProductId: string;
  referencePrice: number;
  lastScrapedAt: string | null;
  priceRecordCount: number;
}
