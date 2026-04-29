import { prisma } from "@/lib/prisma";
import { encryptJson, decryptJson } from "@/lib/integrations/crypto";
import { normalizeListParams, buildPaginationMeta } from "@/lib/admin/filters";
import type {
  AdminProviderAppCredentialListItem,
  AdminProviderAppCredentialDetail,
  AdminProviderAppCredentialListParams,
  CreateProviderAppCredentialInput,
  UpdateProviderAppCredentialInput,
  PaginatedResult,
} from "@/types/admin";

// ─── List ──────────────────────────────────────────────────────────────────────

export async function listProviderAppCredentials(
  params: AdminProviderAppCredentialListParams
): Promise<PaginatedResult<AdminProviderAppCredentialListItem>> {
  const { page, pageSize, skip } = normalizeListParams(params);

  const where = {
    ...(params.provider ? { provider: params.provider as never } : {}),
    ...(params.environment ? { environment: params.environment as never } : {}),
    ...(params.isActive !== undefined && params.isActive !== ""
      ? { isActive: params.isActive === "true" }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.providerAppCredential.findMany({
      where,
      include: { _count: { select: { connections: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.providerAppCredential.count({ where }),
  ]);

  const items: AdminProviderAppCredentialListItem[] = rows.map((r) => ({
    id: r.id,
    provider: r.provider as string,
    environment: r.environment as string,
    displayName: r.displayName,
    authScheme: r.authScheme as string,
    tenantId: r.tenantId,
    clientId: r.clientId,
    keyId: r.keyId,
    developerId: r.developerId,
    scopes: r.scopes,
    isActive: r.isActive,
    connectionCount: r._count.connections,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  return { items, pagination: buildPaginationMeta(total, page, pageSize) };
}

// ─── Get single ───────────────────────────────────────────────────────────────

export async function getProviderAppCredential(
  id: string
): Promise<AdminProviderAppCredentialDetail> {
  const r = await prisma.providerAppCredential.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { connections: true } } },
  });

  let hasClientSecret = false;
  let hasWebhookSecret = false;
  try {
    const config = decryptJson<Record<string, unknown>>(r.configEncrypted);
    hasClientSecret = !!config["clientSecret"];
    hasWebhookSecret = !!config["webhookSecret"];
  } catch {
    // configEncrypted invalid or missing key — surface the flags as false
  }

  return {
    id: r.id,
    provider: r.provider as string,
    environment: r.environment as string,
    displayName: r.displayName,
    authScheme: r.authScheme as string,
    tenantId: r.tenantId,
    clientId: r.clientId,
    keyId: r.keyId,
    developerId: r.developerId,
    scopes: r.scopes,
    hasClientSecret,
    hasWebhookSecret,
    isActive: r.isActive,
    connectionCount: r._count.connections,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProviderAppCredential(
  input: CreateProviderAppCredentialInput
): Promise<{ id: string }> {
  const configPayload: Record<string, string> = {};
  if (input.clientSecret) configPayload["clientSecret"] = input.clientSecret;
  if (input.webhookSecret) configPayload["webhookSecret"] = input.webhookSecret;

  const configEncrypted = encryptJson(configPayload);

  const record = await prisma.providerAppCredential.create({
    data: {
      provider: input.provider as never,
      environment: (input.environment ?? "PRODUCTION") as never,
      displayName: input.displayName,
      authScheme: input.authScheme as never,
      tenantId: input.tenantId ?? null,
      clientId: input.clientId ?? null,
      keyId: input.keyId ?? null,
      developerId: input.developerId ?? null,
      scopes: input.scopes ?? [],
      configEncrypted,
      isActive: true,
    },
  });

  return { id: record.id };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateProviderAppCredential(
  id: string,
  input: UpdateProviderAppCredentialInput
): Promise<void> {
  const existing = await prisma.providerAppCredential.findUniqueOrThrow({
    where: { id },
    select: { configEncrypted: true },
  });

  // If either secret field is being updated, re-encrypt the entire config blob
  const secretsUpdated =
    input.clientSecret !== undefined || input.webhookSecret !== undefined;

  let configEncrypted = existing.configEncrypted;
  if (secretsUpdated) {
    let currentConfig: Record<string, string> = {};
    try {
      currentConfig = decryptJson<Record<string, string>>(existing.configEncrypted);
    } catch {
      // Treat as empty config if decryption fails
    }

    if (input.clientSecret !== undefined) {
      if (input.clientSecret) {
        currentConfig["clientSecret"] = input.clientSecret;
      } else {
        delete currentConfig["clientSecret"];
      }
    }
    if (input.webhookSecret !== undefined) {
      if (input.webhookSecret) {
        currentConfig["webhookSecret"] = input.webhookSecret;
      } else {
        delete currentConfig["webhookSecret"];
      }
    }

    configEncrypted = encryptJson(currentConfig);
  }

  await prisma.providerAppCredential.update({
    where: { id },
    data: {
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
      ...(input.keyId !== undefined ? { keyId: input.keyId } : {}),
      ...(input.developerId !== undefined ? { developerId: input.developerId } : {}),
      ...(input.scopes !== undefined ? { scopes: input.scopes } : {}),
      ...(secretsUpdated ? { configEncrypted } : {}),
    },
  });
}
