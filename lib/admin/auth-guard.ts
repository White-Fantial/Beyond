// Helper to add auth guard for platform admin at the service layer.
// Used in server components and service functions as a secondary guard
// (middleware is the primary guard).
import { requireAuth } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export async function requirePlatformAdmin() {
  const ctx = await requireAuth();
  if (!ctx.isPlatformAdmin) {
    redirect("/unauthorized");
  }
  return ctx;
}
