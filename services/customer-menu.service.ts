/**
 * Customer Menu Service — reads the internal catalog for customer-facing ordering UI.
 *
 * Rules:
 * - Only reads internal catalog_* tables. Never reads external mirror tables.
 * - Never exposes provider-specific fields (source refs, mapping status, etc.).
 * - Uses visibility flags to filter products/categories per channel.
 */

import { prisma } from "@/lib/prisma";

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface CustomerStore {
  id: string;
  code: string;
  name: string;
  displayName: string;
  status: string;
  currency: string;
  timezone: string;
  phone?: string | null;
  email?: string | null;
}

export interface CustomerCategory {
  id: string;
  name: string;
  imageUrl?: string | null;
  displayOrder: number;
}

export interface CustomerModifierOption {
  id: string;
  name: string;
  priceDeltaAmount: number;
  currency: string;
  isDefault: boolean;
  isSoldOut: boolean;
  displayOrder: number;
}

export interface CustomerModifierGroup {
  id: string;
  name: string;
  isRequired: boolean;
  selectionMin: number;
  selectionMax?: number | null;
  displayOrder: number;
  options: CustomerModifierOption[];
}

export interface CustomerProduct {
  id: string;
  name: string;
  /** onlineName if set, otherwise name */
  displayName: string;
  description?: string | null;
  shortDescription?: string | null;
  basePriceAmount: number;
  currency: string;
  imageUrl?: string | null;
  displayOrder: number;
  isFeatured: boolean;
  isSoldOut: boolean;
  hasModifiers: boolean;
  categoryId: string;
}

export interface CustomerProductDetail extends CustomerProduct {
  modifierGroups: CustomerModifierGroup[];
}

export interface CustomerCatalog {
  categories: CustomerCategory[];
  productsByCategory: Record<string, CustomerProduct[]>;
}

// ─── Store Lookup ─────────────────────────────────────────────────────────────

/**
 * Finds a store by its code (storeSlug URL param).
 * Returns null if not found or not ACTIVE.
 */
export async function getStoreBySlugForCustomer(
  storeSlug: string
): Promise<CustomerStore | null> {
  const store = await prisma.store.findFirst({
    where: {
      code: storeSlug,
      status: "ACTIVE",
    },
    select: {
      id: true,
      code: true,
      name: true,
      displayName: true,
      status: true,
      currency: true,
      timezone: true,
      phone: true,
      email: true,
    },
  });
  return store;
}

// ─── Online Order Catalog ─────────────────────────────────────────────────────

/**
 * Returns all categories and products visible for online ordering.
 */
export async function getOnlineCatalogForStore(
  storeId: string
): Promise<CustomerCatalog> {
  return _buildCatalog(storeId, "ONLINE_ORDER");
}

/**
 * Returns all categories and products visible for subscription ordering.
 */
export async function getSubscriptionCatalogForStore(
  storeId: string
): Promise<CustomerCatalog> {
  return _buildCatalog(storeId, "SUBSCRIPTION");
}

async function _buildCatalog(
  storeId: string,
  channel: "ONLINE_ORDER" | "SUBSCRIPTION"
): Promise<CustomerCatalog> {
  const isOnline = channel === "ONLINE_ORDER";

  const categories = await prisma.catalogCategory.findMany({
    where: {
      storeId,
      deletedAt: null,
      isActive: true,
      ...(isOnline
        ? { isVisibleOnOnlineOrder: true }
        : { isVisibleOnSubscription: true }),
    },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      displayOrder: true,
    },
  });

  if (categories.length === 0) {
    return { categories: [], productsByCategory: {} };
  }

  const categoryIds = categories.map((c) => c.id);

  // Fetch product-category links with product data
  const links = await prisma.catalogProductCategory.findMany({
    where: {
      categoryId: { in: categoryIds },
      storeId,
      product: {
        deletedAt: null,
        isActive: true,
        isSellable: true,
        ...(isOnline
          ? { isVisibleOnOnlineOrder: true }
          : { isVisibleOnSubscription: true }),
      },
    },
    orderBy: { sortOrder: "asc" },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          onlineName: true,
          subscriptionName: true,
          description: true,
          shortDescription: true,
          basePriceAmount: true,
          currency: true,
          imageUrl: true,
          displayOrder: true,
          isFeatured: true,
          isSoldOut: true,
          productModifierGroups: {
            where: { modifierGroup: { deletedAt: null, isActive: true } },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  const productsByCategory: Record<string, CustomerProduct[]> = {};

  for (const link of links) {
    const p = link.product;
    const displayName =
      (isOnline ? p.onlineName : p.subscriptionName) || p.name;

    const product: CustomerProduct = {
      id: p.id,
      name: p.name,
      displayName,
      description: p.description,
      shortDescription: p.shortDescription,
      basePriceAmount: p.basePriceAmount,
      currency: p.currency,
      imageUrl: p.imageUrl,
      displayOrder: p.displayOrder,
      isFeatured: p.isFeatured,
      isSoldOut: p.isSoldOut,
      hasModifiers: p.productModifierGroups.length > 0,
      categoryId: link.categoryId,
    };

    if (!productsByCategory[link.categoryId]) {
      productsByCategory[link.categoryId] = [];
    }
    productsByCategory[link.categoryId].push(product);
  }

  // Sort each category's products by displayOrder, then name
  for (const catId of Object.keys(productsByCategory)) {
    productsByCategory[catId].sort(
      (a, b) =>
        a.displayOrder - b.displayOrder || a.displayName.localeCompare(b.displayName)
    );
  }

  return { categories, productsByCategory };
}

// ─── Product Detail (with Modifiers) ─────────────────────────────────────────

/**
 * Returns full product detail including modifier groups and options.
 * Used when opening the product modal.
 */
export async function getProductDetailForOrdering(
  productId: string,
  storeId: string
): Promise<CustomerProductDetail | null> {
  const product = await prisma.catalogProduct.findFirst({
    where: {
      id: productId,
      storeId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      onlineName: true,
      description: true,
      shortDescription: true,
      basePriceAmount: true,
      currency: true,
      imageUrl: true,
      displayOrder: true,
      isFeatured: true,
      isSoldOut: true,
      productModifierGroups: {
        where: {
          modifierGroup: {
            deletedAt: null,
            isActive: true,
            isVisibleOnOnlineOrder: true,
          },
        },
        orderBy: { modifierGroup: { displayOrder: "asc" } },
        include: {
          modifierGroup: {
            include: {
              modifierOptions: {
                where: { deletedAt: null, isActive: true },
                orderBy: { displayOrder: "asc" },
                select: {
                  id: true,
                  name: true,
                  priceDeltaAmount: true,
                  currency: true,
                  isDefault: true,
                  isSoldOut: true,
                  displayOrder: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!product) return null;

  const modifierGroups: CustomerModifierGroup[] = product.productModifierGroups.map(
    (pmg) => ({
      id: pmg.modifierGroup.id,
      name: pmg.modifierGroup.name,
      isRequired: pmg.modifierGroup.isRequired,
      selectionMin: pmg.modifierGroup.selectionMin,
      selectionMax: pmg.modifierGroup.selectionMax,
      displayOrder: pmg.modifierGroup.displayOrder,
      options: pmg.modifierGroup.modifierOptions.map((opt) => ({
        id: opt.id,
        name: opt.name,
        priceDeltaAmount: opt.priceDeltaAmount,
        currency: opt.currency,
        isDefault: opt.isDefault,
        isSoldOut: opt.isSoldOut,
        displayOrder: opt.displayOrder,
      })),
    })
  );

  return {
    id: product.id,
    name: product.name,
    displayName: product.onlineName || product.name,
    description: product.description,
    shortDescription: product.shortDescription,
    basePriceAmount: product.basePriceAmount,
    currency: product.currency,
    imageUrl: product.imageUrl,
    displayOrder: product.displayOrder,
    isFeatured: product.isFeatured,
    isSoldOut: product.isSoldOut,
    hasModifiers: modifierGroups.length > 0,
    categoryId: "",
    modifierGroups,
  };
}
