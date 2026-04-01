// Helper to add auth guard for platform admin at the service layer.
// Used in server components and service functions as a secondary guard
// (middleware is the primary guard).
//
// NOTE: uses getActorUserAuthContext() (not getCurrentUserAuthContext()) so that
// PLATFORM_ADMIN retains access to /admin even while impersonating another user.
import { getActorUserAuthContext } from "@/lib/auth/context";
import { getImpersonationState } from "@/lib/auth/impersonation";
import { redirect } from "next/navigation";

export async function requirePlatformAdmin() {
  const ctx = await getActorUserAuthContext();
  if (!ctx) {
    redirect("/login");
  }
  if (!ctx.isPlatformAdmin) {
    redirect("/unauthorized");
  }
  return ctx;
}

/**
 * Like requirePlatformAdmin() but additionally blocks write actions during
 * impersonation. Admin write actions must always be performed as the real
 * actor identity, not while viewing as another user.
 *
 * Throws an Error (does NOT redirect) so that API route handlers can return
 * a structured JSON error response.
 */
export async function requirePlatformAdminNotImpersonating() {
  const ctx = await requirePlatformAdmin();
  const impersonation = await getImpersonationState();
  if (impersonation) {
    throw new Error("impersonation_active: Exit impersonation before performing admin write actions.");
  }
  return ctx;
}
