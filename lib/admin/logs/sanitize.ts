/**
 * Sensitive-field sanitizer for the Admin Logs Console.
 *
 * All raw payloads/metadata/headers are run through sanitizeObject()
 * before being surfaced in the UI.  Any key that matches a known-sensitive
 * pattern is replaced with "[REDACTED]".  The sanitizer works recursively
 * through nested objects and arrays.
 *
 * Rules:
 *  - Matching is case-insensitive and substring-based.
 *  - Values that are already null/undefined are left as-is.
 *  - Non-object leafs that don't match a sensitive key are left as-is.
 *  - Original data in the database is NEVER modified.
 */

/** Keys (or key substrings) whose values must be redacted. */
const SENSITIVE_KEYS: string[] = [
  "password",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "clientsecret",
  "signingkey",
  "signature",
  "authorization",
  "cookie",
  "session",
  "configencrypted",
  "rawcredential",
  "webhooksecret",
  "apikey",
  "credential",
  "privatekey",
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase().replace(/[_\-\s]/g, "");
  return SENSITIVE_KEYS.some((s) => lower.includes(s));
}

/** Maximum recursion depth to prevent circular-reference runaway. */
const MAX_SANITIZE_DEPTH = 20;

/**
 * Recursively sanitize an object, replacing sensitive values with "[REDACTED]".
 * Returns a new object — does not mutate the input.
 */
export function sanitizeObject(
  value: unknown,
  depth = 0
): unknown {
  // Guard against circular references / runaway depth
  if (depth > MAX_SANITIZE_DEPTH) return "[TRUNCATED]";

  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item, depth + 1));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = isSensitiveKey(k) ? "[REDACTED]" : sanitizeObject(v, depth + 1);
    }
    return result;
  }

  // Primitive (string, number, boolean) — returned as-is
  return value;
}

/**
 * Convenience: parse a JSON string and sanitize it.
 * Returns null if the input is null/undefined or unparseable.
 */
export function sanitizeJsonString(
  raw: string | null | undefined
): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return sanitizeObject(parsed) as Record<string, unknown>;
  } catch {
    return { _raw: "[unparseable]" };
  }
}

/**
 * Sanitize a value that is already a parsed JSON object (e.g. Prisma Json field).
 * Returns null if the input is null/undefined.
 */
export function sanitizeJsonValue(
  value: unknown
): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  return sanitizeObject(value) as Record<string, unknown>;
}
