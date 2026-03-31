// Mappers: convert Prisma raw rows into admin UI view models.
import type {
  AdminTenantListItem,
  AdminUserListItem,
  AdminStoreListItem,
  RecentTenantRow,
  RecentUserRow,
  RecentStoreRow,
  TenantStoreRow,
  TenantMembershipRow,
  UserTenantMembershipRow,
  UserStoreMembershipRow,
  StoreMembershipRow,
  StoreConnectionRow,
  AdminConnectionListItem,
  AdminWebhookLogItem,
  AdminConnectionActionLogItem,
  AdminSubscriptionPlanRow,
} from "@/types/admin";

// ─── Tenant mappers ───────────────────────────────────────────────────────────

export function mapTenantListItem(
  t: {
    id: string;
    displayName: string;
    slug: string;
    status: string;
    timezone: string;
    currency: string;
    createdAt: Date;
  },
  storeCount: number,
  membershipCount: number
): AdminTenantListItem {
  return {
    id: t.id,
    displayName: t.displayName,
    slug: t.slug,
    status: t.status,
    timezone: t.timezone,
    currency: t.currency,
    storeCount,
    membershipCount,
    createdAt: t.createdAt,
  };
}

export function mapRecentTenant(t: {
  id: string;
  displayName: string;
  slug: string;
  status: string;
  createdAt: Date;
}): RecentTenantRow {
  return { id: t.id, displayName: t.displayName, slug: t.slug, status: t.status, createdAt: t.createdAt };
}

export function mapTenantStoreRow(s: {
  id: string;
  name: string;
  code: string;
  status: string;
  timezone: string;
  createdAt: Date;
}): TenantStoreRow {
  return { id: s.id, name: s.name, code: s.code, status: s.status, timezone: s.timezone, createdAt: s.createdAt };
}

export function mapTenantMembershipRow(m: {
  id: string;
  role: string;
  status: string;
  joinedAt: Date | null;
  createdAt: Date;
  user: { name: string; email: string };
}): TenantMembershipRow {
  return {
    id: m.id,
    userName: m.user.name,
    userEmail: m.user.email,
    role: m.role,
    status: m.status,
    joinedAt: m.joinedAt,
    createdAt: m.createdAt,
  };
}

// ─── User mappers ─────────────────────────────────────────────────────────────

export function mapUserListItem(
  u: {
    id: string;
    name: string;
    email: string;
    platformRole: string;
    status: string;
    createdAt: Date;
  },
  tenantCount: number,
  storeCount: number
): AdminUserListItem {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    platformRole: u.platformRole,
    status: u.status,
    tenantCount,
    storeCount,
    createdAt: u.createdAt,
  };
}

export function mapRecentUser(u: {
  id: string;
  name: string;
  email: string;
  platformRole: string;
  createdAt: Date;
}): RecentUserRow {
  return { id: u.id, name: u.name, email: u.email, platformRole: u.platformRole, createdAt: u.createdAt };
}

export function mapUserTenantMembershipRow(m: {
  id: string;
  tenantId: string;
  role: string;
  status: string;
  joinedAt: Date | null;
  createdAt: Date;
  tenant: { displayName: string };
}): UserTenantMembershipRow {
  return {
    id: m.id,
    tenantId: m.tenantId,
    tenantDisplayName: m.tenant.displayName,
    role: m.role,
    status: m.status,
    joinedAt: m.joinedAt,
    createdAt: m.createdAt,
  };
}

export function mapUserStoreMembershipRow(sm: {
  id: string;
  storeId: string;
  role: string;
  status: string;
  createdAt: Date;
  store: { name: string; tenantId: string };
  membership: { tenant: { displayName: string } };
}): UserStoreMembershipRow {
  return {
    id: sm.id,
    storeId: sm.storeId,
    storeName: sm.store.name,
    tenantId: sm.store.tenantId,
    tenantDisplayName: sm.membership.tenant.displayName,
    role: sm.role,
    status: sm.status,
    createdAt: sm.createdAt,
  };
}

// ─── Store mappers ────────────────────────────────────────────────────────────

export function mapStoreListItem(
  s: {
    id: string;
    name: string;
    code: string;
    tenantId: string;
    status: string;
    timezone: string;
    createdAt: Date;
    tenant: { displayName: string };
  },
  connectionCount: number
): AdminStoreListItem {
  return {
    id: s.id,
    name: s.name,
    code: s.code,
    tenantId: s.tenantId,
    tenantDisplayName: s.tenant.displayName,
    status: s.status,
    timezone: s.timezone,
    connectionCount,
    createdAt: s.createdAt,
  };
}

export function mapRecentStore(s: {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  tenant: { displayName: string };
}): RecentStoreRow {
  return { id: s.id, name: s.name, tenantDisplayName: s.tenant.displayName, status: s.status, createdAt: s.createdAt };
}

export function mapStoreMembershipRow(sm: {
  id: string;
  role: string;
  status: string;
  createdAt: Date;
  membership: { userId: string; user: { name: string; email: string } };
}): StoreMembershipRow {
  return {
    id: sm.id,
    userId: sm.membership.userId,
    userName: sm.membership.user.name,
    userEmail: sm.membership.user.email,
    role: sm.role,
    status: sm.status,
    createdAt: sm.createdAt,
  };
}

export function mapStoreConnectionRow(c: {
  id: string;
  provider: string;
  type: string;
  status: string;
  authScheme: string | null;
  externalStoreName: string | null;
  lastConnectedAt: Date | null;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
}): StoreConnectionRow {
  return {
    id: c.id,
    provider: c.provider,
    type: c.type,
    status: c.status,
    authScheme: c.authScheme,
    externalStoreName: c.externalStoreName,
    lastConnectedAt: c.lastConnectedAt,
    lastSyncAt: c.lastSyncAt,
    lastSyncStatus: c.lastSyncStatus,
  };
}

// ─── Platform-wide Connection mappers ─────────────────────────────────────────

export function mapConnectionListItem(c: {
  id: string;
  tenantId: string;
  storeId: string;
  provider: string;
  type: string;
  status: string;
  externalStoreName: string | null;
  lastConnectedAt: Date | null;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  createdAt: Date;
  store: { name: string };
  tenant: { displayName: string };
}): AdminConnectionListItem {
  return {
    id: c.id,
    tenantId: c.tenantId,
    tenantDisplayName: c.tenant.displayName,
    storeId: c.storeId,
    storeName: c.store.name,
    provider: c.provider,
    type: c.type,
    status: c.status,
    externalStoreName: c.externalStoreName,
    lastConnectedAt: c.lastConnectedAt,
    lastSyncAt: c.lastSyncAt,
    lastSyncStatus: c.lastSyncStatus,
    createdAt: c.createdAt,
  };
}

// ─── Webhook log mappers ──────────────────────────────────────────────────────

export function mapWebhookLogItem(w: {
  id: string;
  tenantId: string | null;
  storeId: string | null;
  channelType: string | null;
  eventName: string | null;
  externalEventRef: string | null;
  signatureValid: boolean | null;
  processingStatus: string;
  receivedAt: Date;
  processedAt: Date | null;
  errorMessage: string | null;
}): AdminWebhookLogItem {
  return {
    id: w.id,
    tenantId: w.tenantId,
    storeId: w.storeId,
    channelType: w.channelType,
    eventName: w.eventName,
    externalEventRef: w.externalEventRef,
    signatureValid: w.signatureValid,
    processingStatus: w.processingStatus,
    receivedAt: w.receivedAt,
    processedAt: w.processedAt,
    errorMessage: w.errorMessage,
  };
}

// ─── Connection action log mappers ────────────────────────────────────────────

export function mapConnectionActionLogItem(l: {
  id: string;
  tenantId: string;
  storeId: string;
  provider: string;
  actionType: string;
  status: string;
  message: string | null;
  errorCode: string | null;
  createdAt: Date;
}): AdminConnectionActionLogItem {
  return {
    id: l.id,
    tenantId: l.tenantId,
    storeId: l.storeId,
    provider: l.provider,
    actionType: l.actionType,
    status: l.status,
    message: l.message,
    errorCode: l.errorCode,
    createdAt: l.createdAt,
  };
}

// ─── Billing mappers ──────────────────────────────────────────────────────────

export function mapSubscriptionPlanRow(
  p: {
    id: string;
    storeId: string;
    name: string;
    price: number;
    interval: string;
    isActive: boolean;
    createdAt: Date;
    store: { name: string; tenant: { displayName: string } };
  },
  activeSubscriptions: number
): AdminSubscriptionPlanRow {
  return {
    id: p.id,
    storeId: p.storeId,
    storeName: p.store.name,
    tenantDisplayName: p.store.tenant.displayName,
    name: p.name,
    price: p.price,
    interval: p.interval,
    isActive: p.isActive,
    activeSubscriptions,
    createdAt: p.createdAt,
  };
}
