import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { IMPERSONATION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "./constants";
import type { PlatformRoleKey, MembershipRoleKey, StoreRoleKey } from "./constants";

export interface ImpersonationPayload {
  actorUserId: string;
  actorEmail: string;
  actorName: string;
  effectiveUserId: string;
  effectiveEmail: string;
  effectiveName: string;
  /** Effective user's platform role — used by middleware for route decisions */
  effectivePlatformRole: PlatformRoleKey;
  /** Effective user's primary membership role — used by middleware */
  effectivePrimaryMembershipRole: MembershipRoleKey | null;
  /** Effective user's primary store ID — used by middleware */
  effectivePrimaryStoreId: string | null;
  effectivePrimaryStoreRole: StoreRoleKey | null;
  startedAt: string; // ISO-8601
  reason?: string | null;
}

function getSecret(): Uint8Array {
  const secret =
    process.env.NEXTAUTH_SECRET ??
    process.env.SESSION_SECRET ??
    "beyond-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export async function createImpersonationToken(
  payload: ImpersonationPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyImpersonationToken(
  token: string
): Promise<ImpersonationPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as ImpersonationPayload;
  } catch {
    return null;
  }
}

export async function getImpersonationState(): Promise<ImpersonationPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyImpersonationToken(token);
}

export function getImpersonationCookieOptions(token: string) {
  return {
    name: IMPERSONATION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  };
}

export function clearImpersonationCookieOptions() {
  return {
    name: IMPERSONATION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
}
