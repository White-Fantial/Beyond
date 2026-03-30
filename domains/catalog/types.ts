// ─── Catalog domain types ─────────────────────────────────────────────────────
//
// Internal catalog entities sourced from POS/delivery/local systems.
// These types mirror the DB schema; use Prisma-generated types for DB operations.

export type CatalogSourceType = "POS" | "DELIVERY" | "LOCAL" | "MERGED" | "IMPORTED";
export type CatalogChannelType =
  | "LOYVERSE"
  | "UBER_EATS"
  | "DOORDASH"
  | "ONLINE_ORDER"
  | "SUBSCRIPTION"
  | "OTHER";
export type CatalogEntityType = "CATEGORY" | "PRODUCT" | "MODIFIER_GROUP" | "MODIFIER_OPTION";
export type MappingStatus = "ACTIVE" | "BROKEN" | "PENDING" | "DISCONNECTED";

// ─── Internal catalog ─────────────────────────────────────────────────────────

export interface CatalogCategory {
  id: string;
  tenantId: string;
  storeId: string;
  sourceType: CatalogSourceType;
  sourceOfTruthConnectionId?: string | null;
  sourceCategoryRef?: string | null;
  name: string;
  description?: string | null;
  slug?: string | null;
  displayOrder: number;
  isActive: boolean;
  isVisibleOnOnlineOrder: boolean;
  isVisibleOnSubscription: boolean;
  imageUrl?: string | null;
  metadata: object;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CatalogProduct {
  id: string;
  tenantId: string;
  storeId: string;
  sourceType: CatalogSourceType;
  sourceOfTruthConnectionId?: string | null;
  sourceProductRef?: string | null;
  sku?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  /** Price in integer minor units (e.g. 1250 = $12.50). Never use float. */
  basePriceAmount: number;
  currency: string;
  imageUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  isSellable: boolean;
  isVisibleOnOnlineOrder: boolean;
  isVisibleOnSubscription: boolean;
  isFeatured: boolean;
  posName?: string | null;
  onlineName?: string | null;
  subscriptionName?: string | null;
  internalNote?: string | null;
  metadata: object;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CatalogModifierGroup {
  id: string;
  tenantId: string;
  storeId: string;
  sourceType: CatalogSourceType;
  sourceOfTruthConnectionId?: string | null;
  sourceModifierGroupRef?: string | null;
  name: string;
  description?: string | null;
  selectionMin: number;
  selectionMax?: number | null;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  isVisibleOnOnlineOrder: boolean;
  metadata: object;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  modifierOptions?: CatalogModifierOption[];
}

export interface CatalogModifierOption {
  id: string;
  tenantId: string;
  storeId: string;
  modifierGroupId: string;
  sourceType: CatalogSourceType;
  sourceOfTruthConnectionId?: string | null;
  sourceModifierOptionRef?: string | null;
  name: string;
  description?: string | null;
  /** Price delta in integer minor units. Never use float. */
  priceDeltaAmount: number;
  currency: string;
  displayOrder: number;
  isDefault: boolean;
  isActive: boolean;
  isSoldOut: boolean;
  metadata: object;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CatalogProductCategory {
  id: string;
  tenantId: string;
  storeId: string;
  productId: string;
  categoryId: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: Date;
}

export interface CatalogProductModifierGroup {
  id: string;
  tenantId: string;
  storeId: string;
  productId: string;
  modifierGroupId: string;
  displayOrder: number;
  overrideSelectionMin?: number | null;
  overrideSelectionMax?: number | null;
  overrideRequired?: boolean | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  modifierGroup?: CatalogModifierGroup;
}

// ─── Channel mapping ──────────────────────────────────────────────────────────

export interface ChannelEntityMapping {
  id: string;
  tenantId: string;
  storeId: string;
  entityType: CatalogEntityType;
  internalEntityId: string;
  connectionId: string;
  channelType: CatalogChannelType;
  externalEntityId: string;
  externalParentId?: string | null;
  mappingStatus: MappingStatus;
  lastVerifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Legacy types (kept for backward compatibility) ───────────────────────────

/** @deprecated Use CatalogCategory instead */
export interface Category {
  id: string;
  storeId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

/** @deprecated Use CatalogProduct instead */
export interface MenuItem {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
  optionGroups?: OptionGroup[];
}

/** @deprecated Use CatalogModifierGroup instead */
export interface OptionGroup {
  id: string;
  menuItemId: string;
  name: string;
  isRequired: boolean;
  maxSelections: number;
  options: MenuOption[];
}

/** @deprecated Use CatalogModifierOption instead */
export interface MenuOption {
  id: string;
  optionGroupId: string;
  name: string;
  additionalPrice: number;
}

