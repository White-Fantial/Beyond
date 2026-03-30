/**
 * AES-256-GCM symmetric encryption for credential storage.
 * Key source: process.env.INTEGRATIONS_ENCRYPTION_KEY (hex-encoded 32-byte key).
 *
 * Storage format (colon-delimited base64url):
 *   <iv>:<authTag>:<ciphertext>
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm" as const;
const IV_BYTES = 12; // 96-bit IV recommended for GCM
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const HEX_KEY_REGEX = new RegExp(`^[0-9a-fA-F]{${KEY_BYTES * 2}}$`);

function getKey(): Buffer {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "[integrations/crypto] INTEGRATIONS_ENCRYPTION_KEY environment variable is not set."
    );
  }

  let key: Buffer;
  // Accept either hex (64 chars) or base64 (44 chars)
  if (HEX_KEY_REGEX.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `[integrations/crypto] INTEGRATIONS_ENCRYPTION_KEY must be a 32-byte key ` +
        `(hex: 64 chars, or base64: 44 chars). Got ${key.length} bytes.`
    );
  }
  return key;
}

/**
 * Encrypts any JSON-serialisable value.
 * Returns a compact string suitable for database storage.
 */
export function encryptJson(value: unknown): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const plaintext = JSON.stringify(value);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

/**
 * Decrypts a string produced by {@link encryptJson} and returns the typed value.
 * Throws clearly on any failure — never logs the raw cipher text or key.
 */
export function decryptJson<T = unknown>(cipherText: string): T {
  const key = getKey();
  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    throw new Error("[integrations/crypto] Invalid cipher text format.");
  }

  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64url");
  const authTag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");

  if (iv.length !== IV_BYTES) {
    throw new Error("[integrations/crypto] Invalid IV length in cipher text.");
  }
  if (authTag.length !== TAG_BYTES) {
    throw new Error("[integrations/crypto] Invalid auth tag length in cipher text.");
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    throw new Error(
      "[integrations/crypto] Decryption failed. The key may be wrong or the data corrupted."
    );
  }
}
