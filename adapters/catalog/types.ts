/**
 * Shared types for catalog import adapters (Phase 2).
 *
 * Each adapter returns raw data exactly as received from the provider API.
 * Normalisation and DB persistence happen exclusively in the import service layer.
 */

export interface RawCatalogCategory {
  externalId: string;
  /** Raw payload as returned by the provider — kept verbatim. */
  raw: Record<string, unknown>;
}

export interface RawCatalogProduct {
  externalId: string;
  /** External category id(s) this product belongs to (for link creation). */
  categoryExternalIds: string[];
  /** External modifier group ids this product uses (for link creation). */
  modifierGroupExternalIds: string[];
  raw: Record<string, unknown>;
}

export interface RawCatalogModifierGroup {
  externalId: string;
  raw: Record<string, unknown>;
}

export interface RawCatalogModifierOption {
  externalId: string;
  /** The modifier group this option belongs to. */
  groupExternalId: string;
  raw: Record<string, unknown>;
}

export interface RawCatalogProductCategoryLink {
  productExternalId: string;
  categoryExternalId: string;
}

export interface RawCatalogProductModifierGroupLink {
  productExternalId: string;
  groupExternalId: string;
}

export interface FullCatalogPayload {
  categories: RawCatalogCategory[];
  products: RawCatalogProduct[];
  modifierGroups: RawCatalogModifierGroup[];
  modifierOptions: RawCatalogModifierOption[];
  productCategoryLinks: RawCatalogProductCategoryLink[];
  productModifierGroupLinks: RawCatalogProductModifierGroupLink[];
}

/** Base interface every catalog import adapter must implement. */
export interface CatalogImportAdapter {
  readonly provider: string;
  /** Fetch the full catalog from the external channel. Returns raw data only — no DB writes. */
  fetchFullCatalog(input: { connectionId: string; credentials: Record<string, string> }): Promise<FullCatalogPayload>;
}
