/**
 * Customer Menu Service — reads the internal catalog for customer-facing ordering UI.
 *
 * Rules:
 * - Only reads internal catalog_* tables. Never reads external mirror tables.
 * - Never exposes provider-specific fields (source refs, mapping status, etc.).
 * - Uses visibility flags to filter products/categories per channel.
 */

import { prisma } from "@/lib/prisma";
import { createCanonicalOrderFromInbound } from "@/services/order.service";
import { applyPromoCode } from "@/services/owner/owner-promotions.service";
import type { PlaceGuestOrderInput, PlaceGuestOrderResult, GuestOrderStatus, PlaceGuestSubscriptionInput, PlaceGuestSubscriptionResult, GuestSubscriptionStatus, SubscriptionPlanPublic } from "@/types/storefront";

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface CustomerStore {
  id: string;
  code: string;
  name: string;
  displayName: string;
  status: string;
  currency: string;
  timezone: string;
  tenantId: string;
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
      tenantId: true,
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

// ─── Promo Code Validation ────────────────────────────────────────────────────

export interface ValidatePromoResult {
  valid: boolean;
  discountMinor: number;
  discountType: string;
  discountValue: string;
  description: string | null;
}

/**
 * Validates a promo code for the given tenant and order amount WITHOUT writing to DB.
 * Throws a descriptive error if the code is invalid.
 */
export async function validatePromoCode(
  tenantId: string,
  code: string,
  orderAmountMinor: number
): Promise<ValidatePromoResult> {
  const promo = await prisma.promoCode.findFirst({
    where: { tenantId, code: code.toUpperCase().trim(), status: "ACTIVE" },
  });

  if (!promo) throw new Error(`Promo code "${code}" is not valid`);

  const now = new Date();
  if (promo.startsAt && promo.startsAt > now)
    throw new Error(`Promo code "${code}" is not yet active`);
  if (promo.expiresAt && promo.expiresAt < now)
    throw new Error(`Promo code "${code}" has expired`);
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses)
    throw new Error(`Promo code "${code}" has reached its usage limit`);

  const minOrder = promo.minOrderAmount ? Number(promo.minOrderAmount) * 100 : 0;
  if (orderAmountMinor < minOrder)
    throw new Error(`Minimum order amount not met for promo code "${code}"`);

  let discountMinor = 0;
  if (promo.discountType === "PERCENT") {
    discountMinor = Math.round((orderAmountMinor * Number(promo.discountValue)) / 100);
  } else if (promo.discountType === "FIXED_AMOUNT") {
    discountMinor = Math.min(Math.round(Number(promo.discountValue) * 100), orderAmountMinor);
  }

  return {
    valid: true,
    discountMinor,
    discountType: promo.discountType,
    discountValue: String(promo.discountValue),
    description: promo.description,
  };
}

// ─── Guest Order Placement ────────────────────────────────────────────────────

/**
 * Place an online order on behalf of a guest (no auth required).
 *
 * Validates each item exists in the catalog and is not sold out,
 * then creates a canonical Order via the order service.
 */
export async function placeGuestOrder(
  input: PlaceGuestOrderInput
): Promise<PlaceGuestOrderResult> {
  const {
    storeId, customerName, customerPhone, customerEmail,
    pickupTime, notes, items, currencyCode,
    promoCode, redeemLoyaltyPoints: redeemPoints, userId,
  } = input;

  const store = await prisma.store.findFirst({
    where: { id: storeId, status: "ACTIVE" },
    select: { id: true, tenantId: true, currency: true },
  });
  if (!store) throw new Error("Store not found or unavailable");

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.catalogProduct.findMany({
    where: { id: { in: productIds }, storeId, deletedAt: null, isActive: true },
    select: { id: true, name: true, basePriceAmount: true, isSoldOut: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    if (product.isSoldOut) throw new Error(`Product is sold out: ${product.name}`);
  }

  const selectedOptionIds = [
    ...new Set(items.flatMap((item) => item.selectedModifiers.map((m) => m.optionId))),
  ];
  if (
    selectedOptionIds.length > 0 &&
    "catalogModifierOption" in prisma &&
    typeof prisma.catalogModifierOption?.findMany === "function"
  ) {
    const options = await prisma.catalogModifierOption.findMany({
      where: {
        id: { in: selectedOptionIds },
        storeId,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true, name: true, isSoldOut: true },
    });
    const optionMap = new Map(options.map((o) => [o.id, o]));
    for (const item of items) {
      for (const mod of item.selectedModifiers) {
        const option = optionMap.get(mod.optionId);
        if (!option) throw new Error(`Modifier option not available: ${mod.optionId}`);
        if (option.isSoldOut) throw new Error(`Modifier option is sold out: ${option.name}`);
      }
    }
  }

  const normalizedItems = items.map((item) => {
    const modifierTotal = item.selectedModifiers.reduce(
      (sum, m) => sum + m.priceDeltaAmount,
      0
    );
    const unitPrice = item.unitPriceAmount;
    const lineTotal = item.quantity * (unitPrice + modifierTotal);

    return {
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceAmount: unitPrice,
      totalPriceAmount: lineTotal,
      notes: item.notes,
      modifiers: item.selectedModifiers.map((m) => ({
        modifierGroupId: m.modifierGroupId,
        modifierGroupName: m.modifierGroupName,
        modifierOptionId: m.optionId,
        modifierOptionName: m.optionName,
        unitPriceAmount: m.priceDeltaAmount,
        totalPriceAmount: m.priceDeltaAmount,
      })),
    };
  });

  const subtotal = normalizedItems.reduce((sum, i) => sum + i.totalPriceAmount, 0);

  // ── Promo discount ────────────────────────────────────────────────────────
  let discountApplied = 0;
  if (promoCode) {
    const promoValidation = await validatePromoCode(store.tenantId, promoCode, subtotal);
    discountApplied = promoValidation.discountMinor;
  }

  const afterPromo = Math.max(0, subtotal - discountApplied);

  // ── Loyalty redemption ────────────────────────────────────────────────────
  let pointsToRedeem = 0;
  let loyaltyAccountId: string | null = null;
  if (redeemPoints && userId) {
    const loyaltyAccount = await prisma.loyaltyAccount.findUnique({ where: { userId } });
    if (loyaltyAccount && loyaltyAccount.points > 0) {
      pointsToRedeem = Math.min(loyaltyAccount.points, afterPromo);
      loyaltyAccountId = loyaltyAccount.id;
    }
  }

  const totalAmount = Math.max(0, afterPromo - pointsToRedeem);

  const { order } = await createCanonicalOrderFromInbound({
    tenantId: store.tenantId,
    storeId,
    channelType: "ONLINE",
    orderedAt: new Date(),
    totalAmount,
    currencyCode: currencyCode ?? store.currency ?? "NZD",
    customerName,
    customerPhone,
    customerEmail,
    notes,
    items: normalizedItems,
    rawPayload: { source: "storefront", pickupTime, customerName, items: input.items },
  });

  // ── Record promo redemption (linked to orderId) ───────────────────────────
  if (promoCode && discountApplied > 0) {
    await applyPromoCode(store.tenantId, promoCode, subtotal, userId, order.id);
  }

  // ── Record loyalty redemption ─────────────────────────────────────────────
  if (pointsToRedeem > 0 && loyaltyAccountId) {
    await prisma.$transaction([
      prisma.loyaltyAccount.update({
        where: { id: loyaltyAccountId },
        data: { points: { decrement: pointsToRedeem } },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          accountId: loyaltyAccountId,
          orderId: order.id,
          type: "REDEEM",
          pointsDelta: -pointsToRedeem,
          description: `Redeemed ${pointsToRedeem} points for order ${order.id}`,
        },
      }),
    ]);
  }

  // ── Earn loyalty points on final paid amount ──────────────────────────────
  let loyaltyPointsEarned = 0;
  if (userId && totalAmount > 0) {
    loyaltyPointsEarned = Math.floor(totalAmount / 100);
    if (loyaltyPointsEarned > 0) {
      // Reuse account from redeem step if available; otherwise look up or create
      let earnAccountId = loyaltyAccountId;
      if (!earnAccountId) {
        let account = await prisma.loyaltyAccount.findUnique({ where: { userId } });
        if (!account) {
          account = await prisma.loyaltyAccount.create({
            data: { userId, points: 0, tier: "BRONZE" },
          });
        }
        earnAccountId = account.id;
      }
      await prisma.$transaction([
        prisma.loyaltyAccount.update({
          where: { id: earnAccountId },
          data: { points: { increment: loyaltyPointsEarned } },
        }),
        prisma.loyaltyTransaction.create({
          data: {
            accountId: earnAccountId,
            orderId: order.id,
            type: "EARN",
            pointsDelta: loyaltyPointsEarned,
            description: `Earned ${loyaltyPointsEarned} points for order ${order.id}`,
          },
        }),
      ]);
    }
  }

  return {
    orderId: order.id,
    status: order.status,
    estimatedPickupAt: pickupTime,
    ...(discountApplied > 0 ? { discountApplied } : {}),
    ...(loyaltyPointsEarned > 0 ? { loyaltyPointsEarned } : {}),
    ...(pointsToRedeem > 0 ? { loyaltyPointsRedeemed: pointsToRedeem } : {}),
  };
}

/**
 * Get public order status for the confirmation page.
 * No authentication required — scoped by orderId and storeId.
 */
export async function getGuestOrderStatus(
  storeId: string,
  orderId: string
): Promise<GuestOrderStatus | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: {
      id: true,
      status: true,
      customerName: true,
      originSubmittedAt: true,
      updatedAt: true,
    },
  });

  if (!order) return null;

  return {
    orderId: order.id,
    status: order.status,
    customerName: order.customerName ?? null,
    estimatedPickupAt: order.originSubmittedAt?.toISOString() ?? null,
    updatedAt: order.updatedAt.toISOString(),
  };
}

// ─── Subscription Plans ───────────────────────────────────────────────────────

export async function getSubscriptionPlansForStore(
  storeId: string
): Promise<SubscriptionPlanPublic[]> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { storeId, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    interval: p.interval,
    benefits: Array.isArray(p.benefits) ? (p.benefits as string[]) : [],
  }));
}

export async function enrollGuestSubscription(
  input: PlaceGuestSubscriptionInput
): Promise<PlaceGuestSubscriptionResult> {
  const plan = await prisma.subscriptionPlan.findUniqueOrThrow({
    where: { id: input.planId },
    select: { id: true, storeId: true, price: true, interval: true },
  });

  if (plan.storeId !== input.storeId) {
    throw new Error("Plan does not belong to this store");
  }

  const startDate = new Date(input.startDate);
  const nextBillingDate = new Date(startDate);
  if (input.frequency === "WEEKLY") {
    nextBillingDate.setDate(nextBillingDate.getDate() + 7);
  } else if (input.frequency === "BIWEEKLY") {
    nextBillingDate.setDate(nextBillingDate.getDate() + 14);
  } else {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  }

  const store = await prisma.store.findUniqueOrThrow({
    where: { id: input.storeId },
    select: { tenantId: true },
  });

  const subscription = await prisma.subscription.create({
    data: {
      planId: input.planId,
      customerId: input.customerEmail,
      status: "ACTIVE",
      startDate,
      nextBillingDate,
      tenantId: store.tenantId,
      storeId: input.storeId,
    },
  });

  return {
    subscriptionId: subscription.id,
    status: subscription.status,
    startDate: subscription.startDate.toISOString(),
    nextBillingDate: subscription.nextBillingDate.toISOString(),
    totalAmount: plan.price,
    currencyCode: input.currencyCode,
  };
}

export async function getGuestSubscriptionStatus(
  subscriptionId: string
): Promise<GuestSubscriptionStatus | null> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      status: true,
      customerId: true,
      startDate: true,
      nextBillingDate: true,
      updatedAt: true,
    },
  });

  if (!sub) return null;

  return {
    subscriptionId: sub.id,
    status: sub.status,
    customerName: null,
    frequency: null,
    startDate: sub.startDate.toISOString(),
    nextBillingDate: sub.nextBillingDate.toISOString(),
    updatedAt: sub.updatedAt.toISOString(),
  };
}
