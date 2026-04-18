/**
 * Owner Supplier Credentials Service — Cost Management Phase 5.
 *
 * Manages per-user login credentials for supplier websites.
 * Passwords are encrypted at rest using AES-256-GCM (lib/integrations/crypto.ts).
 * The encryption key is read from SUPPLIER_CREDENTIAL_KEY (falls back to
 * INTEGRATIONS_ENCRYPTION_KEY so a single key covers all credential types).
 */
import { prisma } from "@/lib/prisma";
import { encryptJson, decryptJson } from "@/lib/integrations/crypto";
import type {
  SupplierCredential,
  CreateCredentialInput,
  UpdateCredentialInput,
  VerifyCredentialResult,
} from "@/types/owner-supplier-credentials";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RawCredential = {
  id: string;
  tenantId: string;
  userId: string;
  supplierId: string;
  supplier: { name: string };
  loginUrl: string | null;
  username: string;
  passwordEnc: string;
  lastVerified: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toCredential(row: RawCredential): SupplierCredential {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    loginUrl: row.loginUrl,
    username: row.username,
    lastVerified: row.lastVerified?.toISOString() ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * List all active credentials owned by a user within the tenant.
 */
export async function listCredentials(
  tenantId: string,
  userId: string
): Promise<SupplierCredential[]> {
  const rows = await prisma.supplierCredential.findMany({
    where: { tenantId, userId, deletedAt: null },
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => toCredential(r as RawCredential));
}

/**
 * Create a credential for the given user + supplier.
 * The plain-text password is encrypted before storage.
 */
export async function createCredential(
  tenantId: string,
  userId: string,
  input: CreateCredentialInput
): Promise<SupplierCredential> {
  // Verify supplier belongs to tenant
  const supplier = await prisma.supplier.findFirst({
    where: { id: input.supplierId, tenantId, deletedAt: null },
  });
  if (!supplier) throw new Error(`Supplier ${input.supplierId} not found`);

  // Check for existing active credential
  const existing = await prisma.supplierCredential.findFirst({
    where: { tenantId, userId, supplierId: input.supplierId, deletedAt: null },
  });
  if (existing) {
    throw new Error(
      `A credential for this supplier already exists. Update or delete it first.`
    );
  }

  const passwordEnc = encryptJson(input.password);

  const row = await prisma.supplierCredential.create({
    data: {
      tenantId,
      userId,
      supplierId: input.supplierId,
      loginUrl: input.loginUrl ?? null,
      username: input.username,
      passwordEnc,
      isActive: true,
    },
    include: { supplier: { select: { name: true } } },
  });

  return toCredential(row as RawCredential);
}

/**
 * Update a credential. If `password` is provided it will be re-encrypted.
 */
export async function updateCredential(
  tenantId: string,
  userId: string,
  credentialId: string,
  input: UpdateCredentialInput
): Promise<SupplierCredential> {
  const existing = await prisma.supplierCredential.findFirst({
    where: { id: credentialId, tenantId, userId, deletedAt: null },
    include: { supplier: { select: { name: true } } },
  });
  if (!existing) throw new Error(`SupplierCredential ${credentialId} not found`);

  const data: Record<string, unknown> = {};
  if (input.loginUrl !== undefined) data.loginUrl = input.loginUrl;
  if (input.username !== undefined) data.username = input.username;
  if (input.password !== undefined) data.passwordEnc = encryptJson(input.password);
  if (input.isActive !== undefined) data.isActive = input.isActive;

  const row = await prisma.supplierCredential.update({
    where: { id: credentialId },
    data,
    include: { supplier: { select: { name: true } } },
  });

  return toCredential(row as RawCredential);
}

/**
 * Soft-delete a credential and its price observations.
 */
export async function deleteCredential(
  tenantId: string,
  userId: string,
  credentialId: string
): Promise<void> {
  const existing = await prisma.supplierCredential.findFirst({
    where: { id: credentialId, tenantId, userId, deletedAt: null },
  });
  if (!existing) throw new Error(`SupplierCredential ${credentialId} not found`);

  await prisma.supplierCredential.update({
    where: { id: credentialId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Verify a credential by attempting to log in to the supplier site.
 * Updates lastVerified on success.
 *
 * NOTE: This performs a live HTTP request to the supplier's login endpoint.
 */
export async function verifyCredential(
  tenantId: string,
  userId: string,
  credentialId: string
): Promise<VerifyCredentialResult> {
  const row = await prisma.supplierCredential.findFirst({
    where: { id: credentialId, tenantId, userId, deletedAt: null },
    include: { supplier: { select: { websiteUrl: true } } },
  });
  if (!row) throw new Error(`SupplierCredential ${credentialId} not found`);

  const password = decryptJson<string>(row.passwordEnc);

  // Attempt login via credentialedScraper helper
  const { credentialedScraper } = await import("@/lib/supplier-scraper/credentialed");

  // Use the supplier's website as the target URL for login derivation
  const targetUrl = (row.supplier as { websiteUrl?: string | null }).websiteUrl ?? "";

  let success = false;
  let message = "Login attempt failed — no session cookie returned";

  try {
    // We call scrapeWithCredential against the website root — if it doesn't throw
    // and returns any result, the session was at least acquired
    if (targetUrl) {
      await credentialedScraper.scrapeWithCredential(targetUrl, {
        loginUrl: row.loginUrl,
        username: row.username,
        password,
      });
      success = true;
      message = "Login successful";
    } else {
      message = "No website URL configured for this supplier — cannot verify";
    }
  } catch (err) {
    message = err instanceof Error ? err.message : "Unknown error during verification";
  }

  const verifiedAt = success ? new Date() : null;
  if (success) {
    await prisma.supplierCredential.update({
      where: { id: credentialId },
      data: { lastVerified: verifiedAt },
    });
  }

  return {
    credentialId,
    success,
    verifiedAt: verifiedAt?.toISOString() ?? null,
    message,
  };
}

/**
 * Internal: resolve the decrypted password for a credential.
 * Used by the scraper service.
 */
export async function getDecryptedCredential(
  credentialId: string
): Promise<{ username: string; password: string; loginUrl: string | null }> {
  const row = await prisma.supplierCredential.findFirst({
    where: { id: credentialId, deletedAt: null },
  });
  if (!row) throw new Error(`SupplierCredential ${credentialId} not found`);
  const password = decryptJson<string>(row.passwordEnc);
  return { username: row.username, password, loginUrl: row.loginUrl };
}
