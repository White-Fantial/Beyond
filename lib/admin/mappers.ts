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
