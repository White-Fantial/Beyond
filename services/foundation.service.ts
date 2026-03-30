import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import type {
  StoreMembership,
  Connection,
  ConnectionCredential,
  StoreRole,
  ConnectionType,
  ConnectionProvider,
} from "@prisma/client";

// ─── Errors ────────────────────────────────────────────────────────────────

export class TenantMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantMismatchError";
  }
}

export class DuplicateRecordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateRecordError";
  }
}

// ─── Assign Membership to Store ────────────────────────────────────────────

export interface AssignMembershipToStoreInput {
  tenantId: string;
  membershipId: string;
  storeId: string;
  role: StoreRole;
  actorUserId?: string;
}

/**
 * Assigns a tenant membership to a specific store.
 * Validates that both the membership and the store belong to the same tenant.
 */
export async function assignMembershipToStore(
  input: AssignMembershipToStoreInput
): Promise<StoreMembership> {
  const { tenantId, membershipId, storeId, role, actorUserId } = input;

  const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!membership) throw new Error(`Membership ${membershipId} not found`);
  if (membership.tenantId !== tenantId) {
    throw new TenantMismatchError(
      `Membership ${membershipId} belongs to tenant ${membership.tenantId}, not ${tenantId}`
    );
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error(`Store ${storeId} not found`);
  if (store.tenantId !== tenantId) {
    throw new TenantMismatchError(
      `Store ${storeId} belongs to tenant ${store.tenantId}, not ${tenantId}`
    );
  }

  const existing = await prisma.storeMembership.findUnique({
    where: { membershipId_storeId: { membershipId, storeId } },
  });
  if (existing) {
    throw new DuplicateRecordError(
      `StoreMembership already exists for membership ${membershipId} and store ${storeId}`
    );
  }

  const sm = await prisma.storeMembership.create({
    data: { tenantId, membershipId, storeId, role },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "store_membership.created",
    targetType: "StoreMembership",
    targetId: sm.id,
    metadata: { membershipId, storeId, role },
  });

  return sm;
}

// ─── Create Connection ──────────────────────────────────────────────────────

export interface CreateConnectionInput {
  tenantId: string;
  storeId: string;
  type: ConnectionType;
  provider: ConnectionProvider;
  displayName?: string;
  externalMerchantId?: string;
  externalLocationId?: string;
  actorUserId?: string;
}

/**
 * Creates a new external integration connection for a store.
 * Validates that the store belongs to the given tenant.
 */
export async function createConnection(input: CreateConnectionInput): Promise<Connection> {
  const { tenantId, storeId, type, provider, displayName, externalMerchantId, externalLocationId, actorUserId } = input;

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error(`Store ${storeId} not found`);
  if (store.tenantId !== tenantId) {
    throw new TenantMismatchError(
      `Store ${storeId} belongs to tenant ${store.tenantId}, not ${tenantId}`
    );
  }

  const existing = await prisma.connection.findUnique({
    where: { storeId_provider_type: { storeId, provider, type } },
  });
  if (existing) {
    throw new DuplicateRecordError(
      `Connection already exists for store ${storeId}, type ${type}, provider ${provider}`
    );
  }

  const connection = await prisma.connection.create({
    data: { tenantId, storeId, type, provider, displayName, externalMerchantId, externalLocationId },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "connection.created",
    targetType: "Connection",
    targetId: connection.id,
    metadata: { type, provider },
  });

  return connection;
}

// ─── Upsert Active Credential ──────────────────────────────────────────────

export interface UpsertActiveCredentialInput {
  connectionId: string;
  configEncrypted: string;
  credentialType?: import("@prisma/client").CredentialType;
  authScheme?: import("@prisma/client").AuthScheme;
  actorUserId?: string;
}

/**
 * Creates a new active credential for a connection, deactivating any existing active credentials.
 */
export async function upsertActiveCredential(
  input: UpsertActiveCredentialInput
): Promise<ConnectionCredential> {
  const { connectionId, configEncrypted, actorUserId } = input;
  const credentialType = input.credentialType ?? "OAUTH_TOKEN";
  const authScheme = input.authScheme ?? "OAUTH2";

  const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!connection) throw new Error(`Connection ${connectionId} not found`);

  const credential = await prisma.$transaction(async (tx) => {
    await tx.connectionCredential.updateMany({
      where: { connectionId, isActive: true },
      data: { isActive: false, rotatedAt: new Date() },
    });
    return tx.connectionCredential.create({
      data: {
        connectionId,
        tenantId: connection.tenantId,
        storeId: connection.storeId,
        credentialType,
        authScheme,
        configEncrypted,
        isActive: true,
      },
    });
  });

  await logAuditEvent({
    tenantId: connection.tenantId,
    storeId: connection.storeId,
    actorUserId,
    action: "connection_credential.rotated",
    targetType: "ConnectionCredential",
    targetId: credential.id,
    metadata: { connectionId },
  });

  return credential;
}
