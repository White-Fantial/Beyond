import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type {
  AdminTenantListItem,
  AdminTenantListParams,
  AdminTenantDetail,
  PaginatedResult,
  TenantConnectionSummaryRow,
} from "@/types/admin";
import {
  normalizeListParams,
  buildPaginationMeta,
} from "@/lib/admin/filters";
import {
  mapTenantListItem,
  mapTenantStoreRow,
  mapTenantMembershipRow,
} from "@/lib/admin/mappers";
import {
  auditAdminTenantCreated,
  auditAdminTenantUpdated,
  auditAdminTenantStatusChanged,
} from "@/lib/audit";

export async function listAdminTenants(
  params: AdminTenantListParams
): Promise<PaginatedResult<AdminTenantListItem>> {
  const { q, status, page, pageSize, skip } = normalizeListParams(params);

  const where = {
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { legalName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status ? { status: status as never } : {}),
  };

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        slug: true,
        status: true,
        timezone: true,
        currency: true,
        createdAt: true,
        _count: { select: { stores: true, memberships: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.tenant.count({ where }),
  ]);

  return {
    items: tenants.map((t) =>
      mapTenantListItem(
        { ...t, status: t.status as string },
        t._count.stores,
        t._count.memberships
      )
    ),
    pagination: buildPaginationMeta(total, page, pageSize),
  };
}

export async function getAdminTenantDetail(tenantId: string): Promise<AdminTenantDetail> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      legalName: true,
      displayName: true,
      status: true,
      timezone: true,
      currency: true,
      countryCode: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!tenant) notFound();

  const [
    stores,
    memberships,
    connections,
    userCount,
    connectionCount,
  ] = await Promise.all([
    prisma.store.findMany({
      where: { tenantId },
      select: { id: true, name: true, code: true, status: true, timezone: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.membership.findMany({
      where: { tenantId },
      select: {
        id: true,
        role: true,
        status: true,
        joinedAt: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.connection.findMany({
      where: { tenantId },
      select: { provider: true, status: true },
    }),
    prisma.membership.count({ where: { tenantId } }).then(async () => {
      // distinct user count
      const result = await prisma.membership.findMany({
        where: { tenantId },
        select: { userId: true },
        distinct: ["userId"],
      });
      return result.length;
    }),
    prisma.connection.count({ where: { tenantId } }),
  ]);

  // Build connection summary
  const connMap = new Map<string, { total: number; connected: number }>();
  for (const c of connections) {
    const key = c.provider as string;
    const entry = connMap.get(key) ?? { total: 0, connected: 0 };
    entry.total += 1;
    if (c.status === "CONNECTED") entry.connected += 1;
    connMap.set(key, entry);
  }
  const connectionSummary: TenantConnectionSummaryRow[] = Array.from(connMap.entries()).map(
    ([provider, { total, connected }]) => ({ provider, total, connected })
  );

  return {
    id: tenant.id,
    slug: tenant.slug,
    legalName: tenant.legalName,
    displayName: tenant.displayName,
    status: tenant.status as string,
    timezone: tenant.timezone,
    currency: tenant.currency,
    countryCode: tenant.countryCode,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    storeCount: stores.length,
    membershipCount: memberships.length,
    userCount,
    connectionCount,
    stores: stores.map((s) => mapTenantStoreRow({ ...s, status: s.status as string })),
    memberships: memberships.map((m) =>
      mapTenantMembershipRow({ ...m, role: m.role as string, status: m.status as string })
    ),
    connectionSummary,
  };
}

const ALLOWED_TENANT_STATUSES = ["ACTIVE", "TRIAL", "SUSPENDED", "ARCHIVED"] as const;
type AllowedTenantStatus = (typeof ALLOWED_TENANT_STATUSES)[number];

const SLUG_RE = /^[a-z0-9-]+$/;

// ─── Write operations ─────────────────────────────────────────────────────────

export interface CreateAdminTenantInput {
  slug: string;
  legalName: string;
  displayName: string;
  timezone: string;
  currency: string;
  countryCode: string;
  status?: string;
}

export async function createAdminTenant(
  input: CreateAdminTenantInput,
  actorUserId: string
): Promise<{ id: string }> {
  const { slug, legalName, displayName, timezone, currency, countryCode, status = "ACTIVE" } = input;

  if (!slug || !SLUG_RE.test(slug)) {
    throw new Error("slug은 소문자, 숫자, 하이픈만 허용됩니다.");
  }
  if (!legalName?.trim()) throw new Error("법인명은 필수입니다.");
  if (!displayName?.trim()) throw new Error("표시명은 필수입니다.");
  if (!timezone?.trim()) throw new Error("시간대는 필수입니다.");
  if (!currency?.trim()) throw new Error("통화는 필수입니다.");
  if (!countryCode?.trim()) throw new Error("국가 코드는 필수입니다.");
  if (!ALLOWED_TENANT_STATUSES.includes(status as AllowedTenantStatus)) {
    throw new Error(`올바르지 않은 상태값입니다: ${status}`);
  }

  const existing = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (existing) throw new Error("이미 사용 중인 슬러그입니다.");

  const tenant = await prisma.tenant.create({
    data: {
      slug,
      legalName: legalName.trim(),
      displayName: displayName.trim(),
      timezone: timezone.trim(),
      currency: currency.trim().toUpperCase(),
      countryCode: countryCode.trim().toUpperCase(),
      status: status as never,
    },
    select: { id: true },
  });

  await auditAdminTenantCreated(tenant.id, actorUserId, { slug, displayName });
  return { id: tenant.id };
}

export interface UpdateAdminTenantInput {
  legalName?: string;
  displayName?: string;
  timezone?: string;
  currency?: string;
  countryCode?: string;
  status?: string;
}

export async function updateAdminTenant(
  tenantId: string,
  input: UpdateAdminTenantInput,
  actorUserId: string
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, legalName: true, displayName: true, timezone: true, currency: true, countryCode: true, status: true },
  });
  if (!tenant) notFound();

  const data: Record<string, unknown> = {};
  if (input.legalName !== undefined) {
    if (!input.legalName.trim()) throw new Error("법인명은 필수입니다.");
    data.legalName = input.legalName.trim();
  }
  if (input.displayName !== undefined) {
    if (!input.displayName.trim()) throw new Error("표시명은 필수입니다.");
    data.displayName = input.displayName.trim();
  }
  if (input.timezone !== undefined) data.timezone = input.timezone.trim();
  if (input.currency !== undefined) data.currency = input.currency.trim().toUpperCase();
  if (input.countryCode !== undefined) data.countryCode = input.countryCode.trim().toUpperCase();
  if (input.status !== undefined) {
    if (!ALLOWED_TENANT_STATUSES.includes(input.status as AllowedTenantStatus)) {
      throw new Error(`올바르지 않은 상태값입니다: ${input.status}`);
    }
    data.status = input.status;
  }

  if (Object.keys(data).length === 0) return;

  await prisma.tenant.update({ where: { id: tenantId }, data: { ...data, updatedAt: new Date() } });
  await auditAdminTenantUpdated(tenantId, actorUserId, {
    before: { legalName: tenant.legalName, displayName: tenant.displayName, timezone: tenant.timezone, status: tenant.status },
    after: data,
  });
}

export async function setAdminTenantStatus(
  tenantId: string,
  status: string,
  actorUserId?: string
): Promise<void> {
  if (!ALLOWED_TENANT_STATUSES.includes(status as AllowedTenantStatus)) {
    throw new Error(`Invalid tenant status: ${status}`);
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, status: true } });
  if (!tenant) notFound();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: status as never, updatedAt: new Date() },
  });
  if (actorUserId) {
    await auditAdminTenantStatusChanged(tenantId, actorUserId, { before: tenant.status, after: status });
  }
}
