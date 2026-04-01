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

// ─── Billing audit helpers ────────────────────────────────────────────────────

export async function auditAdminPlanCreated(planId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "PLAN_CREATED", targetType: "Plan", targetId: planId, metadata });
}

export async function auditAdminPlanUpdated(planId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "PLAN_UPDATED", targetType: "Plan", targetId: planId, metadata });
}

export async function auditAdminPlanStatusChanged(planId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "PLAN_STATUS_CHANGED", targetType: "Plan", targetId: planId, metadata });
}

export async function auditAdminTenantPlanAssigned(tenantId: string, subscriptionId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, actorUserId, action: "TENANT_PLAN_ASSIGNED", targetType: "TenantSubscription", targetId: subscriptionId, metadata });
}

export async function auditAdminTenantPlanChanged(tenantId: string, subscriptionId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, actorUserId, action: "TENANT_PLAN_CHANGED", targetType: "TenantSubscription", targetId: subscriptionId, metadata });
}

export async function auditAdminTenantTrialExtended(tenantId: string, subscriptionId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, actorUserId, action: "TENANT_TRIAL_EXTENDED", targetType: "TenantSubscription", targetId: subscriptionId, metadata });
}

export async function auditAdminTenantSubscriptionStatusChanged(tenantId: string, subscriptionId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, actorUserId, action: "TENANT_SUBSCRIPTION_STATUS_CHANGED", targetType: "TenantSubscription", targetId: subscriptionId, metadata });
}

export async function auditAdminTenantBillingAccountUpdated(tenantId: string, billingAccountId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, actorUserId, action: "TENANT_BILLING_ACCOUNT_UPDATED", targetType: "TenantBillingAccount", targetId: billingAccountId, metadata });
}

export async function auditAdminTenantBillingRecordAdded(tenantId: string, recordId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, actorUserId, action: "TENANT_BILLING_RECORD_ADDED", targetType: "BillingRecord", targetId: recordId, metadata });
}

// ─── Integration admin audit helpers ─────────────────────────────────────────

export async function auditAdminConnectionStatusChanged(connectionId: string, tenantId: string, storeId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, storeId, actorUserId, action: "CONNECTION_STATUS_CHANGED", targetType: "Connection", targetId: connectionId, metadata });
}

export async function auditAdminCredentialRotated(connectionId: string, tenantId: string, storeId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ tenantId, storeId, actorUserId, action: "CONNECTION_CREDENTIAL_ROTATED", targetType: "Connection", targetId: connectionId, metadata });
}

// ─── Feature Flag audit helpers ───────────────────────────────────────────────

export async function auditAdminFeatureFlagCreated(flagId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "FEATURE_FLAG_CREATED", targetType: "FeatureFlag", targetId: flagId, metadata });
}

export async function auditAdminFeatureFlagUpdated(flagId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "FEATURE_FLAG_UPDATED", targetType: "FeatureFlag", targetId: flagId, metadata });
}

export async function auditAdminFeatureFlagStatusChanged(flagId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "FEATURE_FLAG_STATUS_CHANGED", targetType: "FeatureFlag", targetId: flagId, metadata });
}

export async function auditAdminFeatureFlagAssignmentCreated(assignmentId: string, flagId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "FEATURE_FLAG_ASSIGNMENT_CREATED", targetType: "FeatureFlagAssignment", targetId: assignmentId, metadata: { ...metadata, flagId } });
}

export async function auditAdminFeatureFlagAssignmentToggled(assignmentId: string, flagId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "FEATURE_FLAG_ASSIGNMENT_TOGGLED", targetType: "FeatureFlagAssignment", targetId: assignmentId, metadata: { ...metadata, flagId } });
}

export async function auditAdminFeatureFlagAssignmentDeleted(assignmentId: string, flagId: string, actorUserId: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({ actorUserId, action: "FEATURE_FLAG_ASSIGNMENT_DELETED", targetType: "FeatureFlagAssignment", targetId: assignmentId, metadata: { ...metadata, flagId } });
}
