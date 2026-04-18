import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supplierCredential: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    supplier: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/integrations/crypto", () => ({
  encryptJson: vi.fn((val: string) => `enc:${val}`),
  decryptJson: vi.fn((val: string) => val.replace(/^enc:/, "")),
}));

import { prisma } from "@/lib/prisma";
import { encryptJson } from "@/lib/integrations/crypto";
import {
  listCredentials,
  createCredential,
  updateCredential,
  deleteCredential,
  getDecryptedCredential,
} from "@/services/owner/owner-supplier-credentials.service";

const mockPrisma = prisma as unknown as {
  supplierCredential: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  supplier: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

const mockEncryptJson = encryptJson as ReturnType<typeof vi.fn>;

const TENANT = "tenant-1";
const USER = "user-1";
const SUP_ID = "sup-1";
const CRED_ID = "cred-1";

const mockSupplier = {
  id: SUP_ID,
  tenantId: TENANT,
  name: "Flour Co",
  deletedAt: null,
};

const mockCredentialRow = {
  id: CRED_ID,
  tenantId: TENANT,
  userId: USER,
  supplierId: SUP_ID,
  supplier: { name: "Flour Co" },
  loginUrl: "https://flourco.nz/login",
  username: "user@flourco.nz",
  passwordEnc: "enc:secret123",
  lastVerified: null,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listCredentials ──────────────────────────────────────────────────────────

describe("listCredentials", () => {
  it("returns credentials for the user without passwordEnc", async () => {
    mockPrisma.supplierCredential.findMany.mockResolvedValue([mockCredentialRow]);

    const result = await listCredentials(TENANT, USER);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(CRED_ID);
    expect(result[0].username).toBe("user@flourco.nz");
    expect(result[0].supplierName).toBe("Flour Co");
    // passwordEnc must NOT appear in the returned object
    expect(result[0]).not.toHaveProperty("passwordEnc");
  });

  it("returns empty array when no credentials exist", async () => {
    mockPrisma.supplierCredential.findMany.mockResolvedValue([]);

    const result = await listCredentials(TENANT, USER);

    expect(result).toHaveLength(0);
  });

  it("scopes query to tenantId and userId", async () => {
    mockPrisma.supplierCredential.findMany.mockResolvedValue([]);

    await listCredentials(TENANT, USER);

    expect(mockPrisma.supplierCredential.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT, userId: USER, deletedAt: null }),
      })
    );
  });
});

// ─── createCredential ─────────────────────────────────────────────────────────

describe("createCredential", () => {
  it("creates a credential with encrypted password", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockSupplier);
    mockPrisma.supplierCredential.findFirst.mockResolvedValue(null); // no existing
    mockPrisma.supplierCredential.create.mockResolvedValue(mockCredentialRow);

    const result = await createCredential(TENANT, USER, {
      supplierId: SUP_ID,
      username: "user@flourco.nz",
      password: "secret123",
      loginUrl: "https://flourco.nz/login",
    });

    expect(mockEncryptJson).toHaveBeenCalledWith("secret123");
    expect(mockPrisma.supplierCredential.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT,
          userId: USER,
          supplierId: SUP_ID,
          passwordEnc: "enc:secret123",
        }),
      })
    );
    expect(result.id).toBe(CRED_ID);
    expect(result).not.toHaveProperty("passwordEnc");
  });

  it("throws if supplier not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null);

    await expect(
      createCredential(TENANT, USER, {
        supplierId: "missing",
        username: "x",
        password: "y",
      })
    ).rejects.toThrow("not found");
  });

  it("throws if active credential already exists for this supplier", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockSupplier);
    mockPrisma.supplierCredential.findFirst.mockResolvedValue(mockCredentialRow);

    await expect(
      createCredential(TENANT, USER, {
        supplierId: SUP_ID,
        username: "other",
        password: "pass",
      })
    ).rejects.toThrow("already exists");
  });
});

// ─── updateCredential ─────────────────────────────────────────────────────────

describe("updateCredential", () => {
  it("updates username without re-encrypting if no password given", async () => {
    mockPrisma.supplierCredential.findFirst.mockResolvedValue(mockCredentialRow);
    mockPrisma.supplierCredential.update.mockResolvedValue({
      ...mockCredentialRow,
      username: "new@flourco.nz",
    });

    const result = await updateCredential(TENANT, USER, CRED_ID, {
      username: "new@flourco.nz",
    });

    expect(result.username).toBe("new@flourco.nz");
    expect(mockEncryptJson).not.toHaveBeenCalled();
  });

  it("re-encrypts when new password is provided", async () => {
    mockPrisma.supplierCredential.findFirst.mockResolvedValue(mockCredentialRow);
    mockPrisma.supplierCredential.update.mockResolvedValue(mockCredentialRow);

    await updateCredential(TENANT, USER, CRED_ID, { password: "newpass" });

    expect(mockEncryptJson).toHaveBeenCalledWith("newpass");
    expect(mockPrisma.supplierCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordEnc: "enc:newpass" }),
      })
    );
  });

  it("throws if credential not found", async () => {
    mockPrisma.supplierCredential.findFirst.mockResolvedValue(null);

    await expect(
      updateCredential(TENANT, USER, "missing", { username: "x" })
    ).rejects.toThrow("not found");
  });
});

// ─── deleteCredential ─────────────────────────────────────────────────────────

describe("deleteCredential", () => {
  it("soft-deletes the credential", async () => {
    mockPrisma.supplierCredential.findFirst.mockResolvedValue(mockCredentialRow);
    mockPrisma.supplierCredential.update.mockResolvedValue({
      ...mockCredentialRow,
      deletedAt: new Date(),
    });

    await deleteCredential(TENANT, USER, CRED_ID);

    expect(mockPrisma.supplierCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CRED_ID },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("throws if credential not found", async () => {
    mockPrisma.supplierCredential.findFirst.mockResolvedValue(null);

    await expect(deleteCredential(TENANT, USER, "missing")).rejects.toThrow("not found");
  });
});

// ─── getDecryptedCredential ───────────────────────────────────────────────────

describe("getDecryptedCredential", () => {
  it("returns decrypted password", async () => {
    mockPrisma.supplierCredential.findFirst.mockResolvedValue({
      id: CRED_ID,
      username: "user@flourco.nz",
      passwordEnc: "enc:secret123",
      loginUrl: null,
      deletedAt: null,
    });

    const result = await getDecryptedCredential(CRED_ID);

    expect(result.username).toBe("user@flourco.nz");
    expect(result.password).toBe("secret123");
    expect(result.loginUrl).toBeNull();
  });

  it("throws if credential not found", async () => {
    mockPrisma.supplierCredential.findFirst.mockResolvedValue(null);

    await expect(getDecryptedCredential("missing")).rejects.toThrow("not found");
  });
});
