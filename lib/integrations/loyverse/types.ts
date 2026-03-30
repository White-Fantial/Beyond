// Loyverse API response types

export interface LoyverseCategory {
  id: string;
  name: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface LoyverseCategoriesResponse {
  categories: LoyverseCategory[];
  cursor?: string;
}

export interface LoyverseModifier {
  id: string;
  name: string;
  price: number; // in currency units (e.g., 1.50 = $1.50)
}

export interface LoyverseModifierGroup {
  id: string;
  name: string;
  modifiers: LoyverseModifier[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface LoyverseModifiersResponse {
  modifiers: LoyverseModifierGroup[];
  cursor?: string;
}

export interface LoyverseItemVariant {
  id?: string;
  item_id?: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost?: number;
  default_pricing_type?: string;
}

export interface LoyverseItem {
  id: string;
  handle?: string;
  reference_id?: string;
  item_name: string;
  description?: string;
  category_id?: string;
  track_stock?: boolean;
  sold_by_weight?: boolean;
  is_composite?: boolean;
  use_production?: boolean;
  primary_supplier_id?: string;
  tax_ids?: string[];
  modifier_ids?: string[];
  variants: LoyverseItemVariant[];
  image_url?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface LoyverseItemsResponse {
  items: LoyverseItem[];
  cursor?: string;
}

export interface LoyverseTokenInfo {
  accessToken: string;
  businessId?: string;
}
