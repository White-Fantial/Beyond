import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface AuditEventInput {
  tenantId?: string | null;
  storeId?: string | null;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown> | null;
}

/**
 * Records an audit log entry. Errors are swallowed to avoid disrupting the main flow.
 */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        storeId: input.storeId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadataJson: input.metadata != null ? (input.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    // Audit failures must not block business operations
    console.error("[audit] Failed to write audit log:", err);
  }
}

export async function auditTenantCreated(tenantId: string, actorUserId?: string) {
  await logAuditEvent({ tenantId, actorUserId, action: "tenant.created", targetType: "Tenant", targetId: tenantId });
}

export async function auditStoreCreated(tenantId: string, storeId: string, actorUserId?: string) {
  await logAuditEvent({ tenantId, storeId, actorUserId, action: "store.created", targetType: "Store", targetId: storeId });
}

export async function auditMembershipCreated(tenantId: string, membershipId: string, actorUserId?: string) {
  await logAuditEvent({ tenantId, actorUserId, action: "membership.created", targetType: "Membership", targetId: membershipId });
}

export async function auditStoreMembershipCreated(tenantId: string, storeId: string, storeMembershipId: string, actorUserId?: string) {
  await logAuditEvent({ tenantId, storeId, actorUserId, action: "store_membership.created", targetType: "StoreMembership", targetId: storeMembershipId });
}

export async function auditConnectionCreated(tenantId: string, storeId: string, connectionId: string, actorUserId?: string) {
  await logAuditEvent({ tenantId, storeId, actorUserId, action: "connection.created", targetType: "Connection", targetId: connectionId });
}

export async function auditConnectionStatusChanged(tenantId: string, storeId: string, connectionId: string, newStatus: string, actorUserId?: string) {
  await logAuditEvent({
    tenantId, storeId, actorUserId,
    action: "connection.status_changed",
    targetType: "Connection",
    targetId: connectionId,
    metadata: { newStatus },
  });
}
