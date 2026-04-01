import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type {
  AdminStoreListItem,
  AdminStoreListParams,
  AdminStoreDetail,
  PaginatedResult,
} from "@/types/admin";
import { normalizeListParams, buildPaginationMeta } from "@/lib/admin/filters";
import {
  mapStoreListItem,
  mapStoreMembershipRow,
  mapStoreConnectionRow,
} from "@/lib/admin/mappers";
import {
  auditAdminStoreCreated,
  auditAdminStoreUpdated,
  auditAdminStoreStatusChanged,
} from "@/lib/audit";

export async function listAdminStores(
  params: AdminStoreListParams
): Promise<PaginatedResult<AdminStoreListItem>> {
  const { q, status, page, pageSize, skip } = normalizeListParams(params);

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { code: { contains: q, mode: "insensitive" as const } },
            { tenant: { displayName: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(status ? { status: status as never } : {}),
  };

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        tenantId: true,
        status: true,
        timezone: true,
        createdAt: true,
        tenant: { select: { displayName: true } },
        _count: { select: { connections: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.store.count({ where }),
  ]);

  return {
    items: stores.map((s) =>
      mapStoreListItem({ ...s, status: s.status as string }, s._count.connections)
    ),
    pagination: buildPaginationMeta(total, page, pageSize),
  };
}

export async function getAdminStoreDetail(storeId: string): Promise<AdminStoreDetail> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      tenantId: true,
      name: true,
      displayName: true,
      code: true,
      status: true,
      timezone: true,
      currency: true,
      countryCode: true,
      createdAt: true,
      updatedAt: true,
      tenant: { select: { displayName: true } },
    },
  });

  if (!store) notFound();

  const [memberships, connections, activeConnectionCount] = await Promise.all([
    prisma.storeMembership.findMany({
      where: { storeId },
      select: {
        id: true,
        role: true,
        status: true,
        createdAt: true,
        membership: {
          select: {
            userId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.connection.findMany({
      where: { storeId },
      select: {
        id: true,
        provider: true,
        type: true,
        status: true,
        authScheme: true,
        externalStoreName: true,
        lastConnectedAt: true,
        lastSyncAt: true,
        lastSyncStatus: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.connection.count({ where: { storeId, status: "CONNECTED" } }),
  ]);

  return {
    id: store.id,
    tenantId: store.tenantId,
    tenantDisplayName: store.tenant.displayName,
    name: store.name,
    displayName: store.displayName,
    code: store.code,
    status: store.status as string,
    timezone: store.timezone,
    currency: store.currency,
    countryCode: store.countryCode,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
    membershipCount: memberships.length,
    connectionCount: connections.length,
    activeConnectionCount,
    memberships: memberships.map((sm) =>
      mapStoreMembershipRow({ ...sm, role: sm.role as string, status: sm.status as string })
    ),
    connections: connections.map((c) =>
      mapStoreConnectionRow({
        ...c,
        provider: c.provider as string,
        type: c.type as string,
        status: c.status as string,
        authScheme: c.authScheme as string | null,
      })
    ),
  };
}

const ALLOWED_STORE_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
type AllowedStoreStatus = (typeof ALLOWED_STORE_STATUSES)[number];

// ─── Write operations ─────────────────────────────────────────────────────────

export interface CreateAdminStoreInput {
  tenantId: string;
  code: string;
  name: string;
  displayName: string;
  timezone: string;
  currency: string;
  countryCode: string;
  status?: string;
}

export async function createAdminStore(
  input: CreateAdminStoreInput,
  actorUserId: string
): Promise<{ id: string }> {
  const { tenantId, code, name, displayName, timezone, currency, countryCode, status = "ACTIVE" } = input;

  if (!tenantId?.trim()) throw new Error("테넌트 ID는 필수입니다.");
  if (!code?.trim()) throw new Error("코드는 필수입니다.");
  if (!name?.trim()) throw new Error("매장명은 필수입니다.");
  if (!displayName?.trim()) throw new Error("표시명은 필수입니다.");
  if (!timezone?.trim()) throw new Error("시간대는 필수입니다.");
  if (!currency?.trim()) throw new Error("통화는 필수입니다.");
  if (!countryCode?.trim()) throw new Error("국가 코드는 필수입니다.");
  if (!ALLOWED_STORE_STATUSES.includes(status as AllowedStoreStatus)) {
    throw new Error(`올바르지 않은 상태값입니다: ${status}`);
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) throw new Error("테넌트를 찾을 수 없습니다.");

  const existing = await prisma.store.findUnique({
    where: { tenantId_code: { tenantId, code: code.trim() } },
    select: { id: true },
  });
  if (existing) throw new Error("같은 테넌트 내에 이미 사용 중인 코드입니다.");

  const store = await prisma.store.create({
    data: {
      tenantId,
      code: code.trim(),
      name: name.trim(),
      displayName: displayName.trim(),
      timezone: timezone.trim(),
      currency: currency.trim().toUpperCase(),
      countryCode: countryCode.trim().toUpperCase(),
      status: status as never,
    },
    select: { id: true },
  });

  await auditAdminStoreCreated(store.id, tenantId, actorUserId, { code, name });
  return { id: store.id };
}

export interface UpdateAdminStoreInput {
  name?: string;
  displayName?: string;
  timezone?: string;
  currency?: string;
  countryCode?: string;
  status?: string;
}

export async function updateAdminStore(
  storeId: string,
  input: UpdateAdminStoreInput,
  actorUserId: string
): Promise<void> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, tenantId: true, name: true, displayName: true, timezone: true, currency: true, countryCode: true, status: true },
  });
  if (!store) notFound();

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error("매장명은 필수입니다.");
    data.name = input.name.trim();
  }
  if (input.displayName !== undefined) {
    if (!input.displayName.trim()) throw new Error("표시명은 필수입니다.");
    data.displayName = input.displayName.trim();
  }
  if (input.timezone !== undefined) data.timezone = input.timezone.trim();
  if (input.currency !== undefined) data.currency = input.currency.trim().toUpperCase();
  if (input.countryCode !== undefined) data.countryCode = input.countryCode.trim().toUpperCase();
  if (input.status !== undefined) {
    if (!ALLOWED_STORE_STATUSES.includes(input.status as AllowedStoreStatus)) {
      throw new Error(`올바르지 않은 상태값입니다: ${input.status}`);
    }
    data.status = input.status;
  }

  if (Object.keys(data).length === 0) return;

  await prisma.store.update({ where: { id: storeId }, data: { ...data, updatedAt: new Date() } });
  await auditAdminStoreUpdated(storeId, store.tenantId, actorUserId, {
    before: { name: store.name, displayName: store.displayName, timezone: store.timezone, status: store.status },
    after: data,
  });
}

export async function setAdminStoreStatus(
  storeId: string,
  status: string,
  actorUserId?: string
): Promise<void> {
  if (!ALLOWED_STORE_STATUSES.includes(status as AllowedStoreStatus)) {
    throw new Error(`Invalid store status: ${status}`);
  }
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true, tenantId: true, status: true } });
  if (!store) notFound();
  await prisma.store.update({
    where: { id: storeId },
    data: { status: status as never, updatedAt: new Date() },
  });
  if (actorUserId) {
    await auditAdminStoreStatusChanged(storeId, store.tenantId, actorUserId, { before: store.status, after: status });
  }
}
