// Helper to add auth guard for platform admin at the service layer.
// Used in server components and service functions as a secondary guard
// (middleware is the primary guard).
//
// NOTE: uses getActorUserAuthContext() (not getCurrentUserAuthContext()) so that
// PLATFORM_ADMIN retains access to /admin even while impersonating another user.
import { getActorUserAuthContext } from "@/lib/auth/context";
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
