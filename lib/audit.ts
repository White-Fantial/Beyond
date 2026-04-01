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

// ─── Admin write audit helpers ────────────────────────────────────────────────

export async function auditAdminTenantCreated(tenantId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, actorUserId, action: "TENANT_CREATED", targetType: "Tenant", targetId: tenantId, metadata });
}

export async function auditAdminTenantUpdated(tenantId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, actorUserId, action: "TENANT_UPDATED", targetType: "Tenant", targetId: tenantId, metadata });
}

export async function auditAdminTenantStatusChanged(tenantId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, actorUserId, action: "TENANT_STATUS_CHANGED", targetType: "Tenant", targetId: tenantId, metadata });
}

export async function auditAdminUserCreated(userId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "USER_CREATED", targetType: "User", targetId: userId, metadata });
}

export async function auditAdminUserUpdated(userId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "USER_UPDATED", targetType: "User", targetId: userId, metadata });
}

export async function auditAdminUserStatusChanged(userId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "USER_STATUS_CHANGED", targetType: "User", targetId: userId, metadata });
}

export async function auditAdminUserPlatformRoleChanged(userId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "USER_PLATFORM_ROLE_CHANGED", targetType: "User", targetId: userId, metadata });
}

export async function auditAdminTenantMembershipCreated(membershipId: string, tenantId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, actorUserId, action: "TENANT_MEMBERSHIP_CREATED", targetType: "Membership", targetId: membershipId, metadata });
}

export async function auditAdminTenantMembershipUpdated(membershipId: string, tenantId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, actorUserId, action: "TENANT_MEMBERSHIP_UPDATED", targetType: "Membership", targetId: membershipId, metadata });
}

export async function auditAdminStoreMembershipCreated(storeMembershipId: string, tenantId: string, storeId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, storeId, actorUserId, action: "STORE_MEMBERSHIP_CREATED", targetType: "StoreMembership", targetId: storeMembershipId, metadata });
}

export async function auditAdminStoreMembershipUpdated(storeMembershipId: string, tenantId: string, storeId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, storeId, actorUserId, action: "STORE_MEMBERSHIP_UPDATED", targetType: "StoreMembership", targetId: storeMembershipId, metadata });
}

export async function auditAdminStoreCreated(storeId: string, tenantId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, storeId, actorUserId, action: "STORE_CREATED", targetType: "Store", targetId: storeId, metadata });
}

export async function auditAdminStoreUpdated(storeId: string, tenantId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, storeId, actorUserId, action: "STORE_UPDATED", targetType: "Store", targetId: storeId, metadata });
}

export async function auditAdminStoreStatusChanged(storeId: string, tenantId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, storeId, actorUserId, action: "STORE_STATUS_CHANGED", targetType: "Store", targetId: storeId, metadata });
}

// ─── Job audit helpers ────────────────────────────────────────────────────────

export async function auditJobManualRunRequested(jobRunId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "JOB_MANUAL_RUN_REQUESTED", targetType: "JobRun", targetId: jobRunId, metadata });
}

export async function auditJobRunCreated(jobRunId: string, actorUserId: string | undefined, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "JOB_RUN_CREATED", targetType: "JobRun", targetId: jobRunId, metadata });
}

export async function auditJobRunStarted(jobRunId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ action: "JOB_RUN_STARTED", targetType: "JobRun", targetId: jobRunId, metadata });
}

export async function auditJobRunSucceeded(jobRunId: string, actorUserId: string | undefined, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "JOB_RUN_SUCCEEDED", targetType: "JobRun", targetId: jobRunId, metadata });
}

export async function auditJobRunFailed(jobRunId: string, actorUserId: string | undefined, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "JOB_RUN_FAILED", targetType: "JobRun", targetId: jobRunId, metadata });
}

export async function auditJobRunRetried(jobRunId: string, originalRunId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "JOB_RUN_RETRIED", targetType: "JobRun", targetId: jobRunId, metadata: { ...metadata, originalRunId } });
}
