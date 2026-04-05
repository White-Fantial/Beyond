/**
 * Owner Settings Service — read and update store settings.
 *
 * Only owner-local fields are editable here.
 * POS-sourced fields (name, basePriceAmount, etc.) are not touched.
 */
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import type {
  OwnerStoreSettingsView,
  OwnerStoreHoursRow,
  OwnerCatalogSettings,
  TenantSettingsView,
} from "@/types/owner";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getOwnerStoreSettings(storeId: string): Promise<OwnerStoreSettingsView> {
  const store = await prisma.store.findUniqueOrThrow({
    where: { id: storeId },
    include: {
      storeSettings: true,
      storeOperationSettings: true,
      storeHours: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  const hours: OwnerStoreHoursRow[] = store.storeHours.map((h) => ({
    id: h.id,
    dayOfWeek: h.dayOfWeek,
    isOpen: h.isOpen,
    openTimeLocal: h.openTimeLocal,
    closeTimeLocal: h.closeTimeLocal,
    pickupStartTimeLocal: h.pickupStartTimeLocal,
    pickupEndTimeLocal: h.pickupEndTimeLocal,
  }));

  // Fill gaps for days not yet in DB
  const existingDays = new Set(store.storeHours.map((h) => h.dayOfWeek));
  for (let d = 0; d < 7; d++) {
    if (!existingDays.has(d)) {
      hours.push({
        id: null,
        dayOfWeek: d,
        // 0=Sunday, 6=Saturday — weekends closed by default
        isOpen: d !== 0 && d !== 6,
        openTimeLocal: "09:00",
        closeTimeLocal: "17:00",
        pickupStartTimeLocal: null,
        pickupEndTimeLocal: null,
      });
    }
  }
  hours.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  const ops = store.storeOperationSettings;

  return {
    store: {
      id: store.id,
      name: store.name,
      displayName: store.displayName,
      phone: store.phone,
      email: store.email,
      addressLine1: store.addressLine1,
      addressLine2: store.addressLine2,
      city: store.city,
      region: store.region,
      postalCode: store.postalCode,
      countryCode: store.countryCode,
      timezone: store.timezone,
      currency: store.currency,
    },
    settings: store.storeSettings
      ? {
          taxRate: Number(store.storeSettings.taxRate),
          serviceFeeRate: Number(store.storeSettings.serviceFeeRate),
          pickupIntervalMinutes: store.storeSettings.pickupIntervalMinutes,
          defaultPrepTimeMinutes: store.storeSettings.defaultPrepTimeMinutes,
          logoUrl: store.storeSettings.logoUrl,
        }
      : null,
    operationSettings: ops
      ? {
          storeOpen: ops.storeOpen,
          holidayMode: ops.holidayMode,
          pickupIntervalMinutes: ops.pickupIntervalMinutes,
          pickupLeadMinutes: ops.pickupLeadMinutes,
          minPrepTimeMinutes: ops.minPrepTimeMinutes,
          maxOrdersPerSlot: ops.maxOrdersPerSlot,
          allowSameDayOrders: ops.allowSameDayOrders,
          sameDayOrderCutoffMinutesBeforeClose: ops.sameDayOrderCutoffMinutesBeforeClose,
          autoSelectPickupTime: ops.autoSelectPickupTime,
          autoAcceptOrders: ops.autoAcceptOrders,
          autoPrintPos: ops.autoPrintPos,
          subscriptionEnabled: ops.subscriptionEnabled,
          subscriptionPauseAllowed: ops.subscriptionPauseAllowed,
          subscriptionSkipAllowed: ops.subscriptionSkipAllowed,
          subscriptionMinimumAmount: ops.subscriptionMinimumAmount,
          subscriptionDiscountBps: ops.subscriptionDiscountBps,
          subscriptionOrderLeadDays: ops.subscriptionOrderLeadDays,
          subscriptionAllowedWeekdaysJson: ops.subscriptionAllowedWeekdaysJson,
          onlineOrderEnabled: ops.onlineOrderEnabled,
          soldOutResetMode: ops.soldOutResetMode,
          soldOutResetHourLocal: ops.soldOutResetHourLocal,
          defaultAvailabilityMode: ops.defaultAvailabilityMode,
        }
      : null,
    hours,
  };
}

// ─── Update store basic info ──────────────────────────────────────────────────

export interface UpdateStoreBasicInfoInput {
  storeId: string;
  tenantId: string;
  actorUserId: string;
  data: {
    displayName?: string;
    phone?: string | null;
    email?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
    timezone?: string;
    currency?: string;
  };
}

export async function updateOwnerStoreBasicInfo(input: UpdateStoreBasicInfoInput): Promise<void> {
  const { storeId, tenantId, actorUserId, data } = input;

  await prisma.store.update({
    where: { id: storeId },
    data: {
      displayName: data.displayName,
      phone: data.phone,
      email: data.email,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      city: data.city,
      region: data.region,
      postalCode: data.postalCode,
      timezone: data.timezone,
      currency: data.currency,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "OWNER_STORE_SETTINGS_UPDATED",
    targetType: "Store",
    targetId: storeId,
    metadata: { fields: Object.keys(data) },
  });
}

// ─── Update operation settings ────────────────────────────────────────────────

export interface UpdateOperationSettingsInput {
  storeId: string;
  tenantId: string;
  actorUserId: string;
  data: {
    storeOpen?: boolean;
    holidayMode?: boolean;
    pickupIntervalMinutes?: number;
    pickupLeadMinutes?: number;
    minPrepTimeMinutes?: number;
    maxOrdersPerSlot?: number;
    allowSameDayOrders?: boolean;
    sameDayOrderCutoffMinutesBeforeClose?: number;
    autoSelectPickupTime?: boolean;
    autoAcceptOrders?: boolean;
    subscriptionEnabled?: boolean;
    subscriptionPauseAllowed?: boolean;
    subscriptionSkipAllowed?: boolean;
    subscriptionMinimumAmount?: number;
    subscriptionDiscountBps?: number;
    subscriptionOrderLeadDays?: number;
    subscriptionAllowedWeekdaysJson?: string | null;
    onlineOrderEnabled?: boolean;
    soldOutResetMode?: string;
    soldOutResetHourLocal?: number;
    defaultAvailabilityMode?: string;
  };
}

export async function updateOwnerOperationSettings(
  input: UpdateOperationSettingsInput
): Promise<void> {
  const { storeId, tenantId, actorUserId, data } = input;

  await prisma.storeOperationSettings.upsert({
    where: { storeId },
    create: { storeId, ...data } as Parameters<
      typeof prisma.storeOperationSettings.upsert
    >[0]["create"],
    update: data as Parameters<typeof prisma.storeOperationSettings.upsert>[0]["update"],
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "OWNER_STORE_SETTINGS_UPDATED",
    targetType: "StoreOperationSettings",
    targetId: storeId,
    metadata: { fields: Object.keys(data) },
  });
}

// ─── Update store hours ───────────────────────────────────────────────────────

export interface UpdateStoreHoursInput {
  storeId: string;
  tenantId: string;
  actorUserId: string;
  hours: Array<{
    dayOfWeek: number;
    isOpen: boolean;
    openTimeLocal: string;
    closeTimeLocal: string;
    pickupStartTimeLocal?: string | null;
    pickupEndTimeLocal?: string | null;
  }>;
}

export async function updateOwnerStoreHours(input: UpdateStoreHoursInput): Promise<void> {
  const { storeId, tenantId, actorUserId, hours } = input;

  await prisma.$transaction(
    hours.map((h) =>
      prisma.storeHours.upsert({
        where: { storeId_dayOfWeek: { storeId, dayOfWeek: h.dayOfWeek } },
        create: {
          storeId,
          tenantId,
          dayOfWeek: h.dayOfWeek,
          isOpen: h.isOpen,
          openTimeLocal: h.openTimeLocal,
          closeTimeLocal: h.closeTimeLocal,
          pickupStartTimeLocal: h.pickupStartTimeLocal ?? null,
          pickupEndTimeLocal: h.pickupEndTimeLocal ?? null,
        },
        update: {
          isOpen: h.isOpen,
          openTimeLocal: h.openTimeLocal,
          closeTimeLocal: h.closeTimeLocal,
          pickupStartTimeLocal: h.pickupStartTimeLocal ?? null,
          pickupEndTimeLocal: h.pickupEndTimeLocal ?? null,
        },
      })
    )
  );

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "OWNER_STORE_HOURS_UPDATED",
    targetType: "StoreHours",
    targetId: storeId,
    metadata: { days: hours.map((h) => h.dayOfWeek) },
  });
}

// ─── Catalog Settings ─────────────────────────────────────────────────────────

export async function getCatalogSettingsForTenant(
  tenantId: string
): Promise<OwnerCatalogSettings[]> {
  const stores = await prisma.store.findMany({
    where: { tenantId, status: { not: "ARCHIVED" } },
    include: { catalogSettings: true },
    orderBy: { name: "asc" },
  });

  return stores.map((store) => ({
    id: store.catalogSettings?.id ?? null,
    storeId: store.id,
    storeName: store.name,
    sourceConnectionId: store.catalogSettings?.sourceConnectionId ?? null,
    sourceType: store.catalogSettings?.sourceType ?? "LOCAL",
    autoSync: store.catalogSettings?.autoSync ?? false,
    syncIntervalMinutes: store.catalogSettings?.syncIntervalMinutes ?? 60,
  }));
}

export interface UpdateCatalogSettingsInput {
  storeId: string;
  tenantId: string;
  actorUserId: string;
  data: {
    sourceType?: string;
    autoSync?: boolean;
    syncIntervalMinutes?: number;
    sourceConnectionId?: string | null;
  };
}

export async function updateOwnerCatalogSettings(
  input: UpdateCatalogSettingsInput
): Promise<void> {
  const { storeId, tenantId, actorUserId, data } = input;

  await prisma.catalogSettings.upsert({
    where: { storeId },
    create: {
      storeId,
      sourceType: (data.sourceType as Parameters<typeof prisma.catalogSettings.create>[0]["data"]["sourceType"]) ?? "LOCAL",
      autoSync: data.autoSync ?? false,
      syncIntervalMinutes: data.syncIntervalMinutes ?? 60,
      sourceConnectionId: data.sourceConnectionId ?? null,
    },
    update: {
      sourceType: data.sourceType as Parameters<typeof prisma.catalogSettings.update>[0]["data"]["sourceType"],
      autoSync: data.autoSync,
      syncIntervalMinutes: data.syncIntervalMinutes,
      sourceConnectionId: data.sourceConnectionId,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "OWNER_STORE_SETTINGS_UPDATED",
    targetType: "CatalogSettings",
    targetId: storeId,
    metadata: { fields: Object.keys(data) },
  });
}

// ─── Tenant Settings ──────────────────────────────────────────────────────────

export async function getOwnerTenantSettings(
  tenantId: string
): Promise<TenantSettingsView | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      displayName: true,
      legalName: true,
      timezone: true,
      currency: true,
      countryCode: true,
    },
  });
  if (!tenant) return null;
  return {
    id: tenant.id,
    displayName: tenant.displayName,
    legalName: tenant.legalName,
    timezone: tenant.timezone,
    currency: tenant.currency,
    countryCode: tenant.countryCode,
  };
}

export interface UpdateTenantSettingsInput {
  tenantId: string;
  actorUserId: string;
  data: {
    displayName?: string;
    timezone?: string;
    currency?: string;
  };
}

export async function updateOwnerTenantSettings(
  input: UpdateTenantSettingsInput
): Promise<void> {
  const { tenantId, actorUserId, data } = input;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      displayName: data.displayName,
      timezone: data.timezone,
      currency: data.currency,
    },
  });

  await logAuditEvent({
    tenantId,
    storeId: null,
    actorUserId,
    action: "OWNER_STORE_SETTINGS_UPDATED",
    targetType: "Tenant",
    targetId: tenantId,
    metadata: { fields: Object.keys(data) },
  });
}
