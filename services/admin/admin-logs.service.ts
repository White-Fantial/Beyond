import { prisma } from "@/lib/prisma";
import type {
  AdminWebhookLogItem,
  AdminWebhookLogParams,
  AdminConnectionActionLogItem,
  AdminConnectionActionLogParams,
  PaginatedResult,
} from "@/types/admin";
import { normalizeListParams, buildPaginationMeta } from "@/lib/admin/filters";
import { mapWebhookLogItem, mapConnectionActionLogItem } from "@/lib/admin/mappers";

export async function listAdminWebhookLogs(
  params: AdminWebhookLogParams
): Promise<PaginatedResult<AdminWebhookLogItem>> {
  const { page, pageSize, skip } = normalizeListParams(params);

  const processingStatus = params.status || undefined;
  const channelType = params.channelType || undefined;

  const where = {
    ...(processingStatus ? { processingStatus } : {}),
    ...(channelType ? { channelType: channelType as never } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.inboundWebhookLog.findMany({
      where,
      select: {
        id: true,
        tenantId: true,
        storeId: true,
        channelType: true,
        eventName: true,
        externalEventRef: true,
        signatureValid: true,
        processingStatus: true,
        receivedAt: true,
        processedAt: true,
        errorMessage: true,
      },
      orderBy: { receivedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.inboundWebhookLog.count({ where }),
  ]);

  return {
    items: logs.map((l) =>
      mapWebhookLogItem({ ...l, channelType: l.channelType as string | null })
    ),
    pagination: buildPaginationMeta(total, page, pageSize),
  };
}

export async function listAdminConnectionActionLogs(
  params: AdminConnectionActionLogParams
): Promise<PaginatedResult<AdminConnectionActionLogItem>> {
  const { page, pageSize, skip } = normalizeListParams(params);

  const provider = params.provider || undefined;
  const status = params.status || undefined;

  const where = {
    ...(provider ? { provider: provider as never } : {}),
    ...(status ? { status } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.connectionActionLog.findMany({
      where,
      select: {
        id: true,
        tenantId: true,
        storeId: true,
        provider: true,
        actionType: true,
        status: true,
        message: true,
        errorCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.connectionActionLog.count({ where }),
  ]);

  return {
    items: logs.map((l) =>
      mapConnectionActionLogItem({
        ...l,
        provider: l.provider as string,
        actionType: l.actionType as string,
      })
    ),
    pagination: buildPaginationMeta(total, page, pageSize),
  };
}
