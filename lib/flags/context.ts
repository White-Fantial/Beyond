import type { FlagEvaluationContext } from "@/types/feature-flags";
import { getActorUserAuthContext } from "@/lib/auth/context";

/**
 * Build a flag evaluation context from the current server auth session.
 * Returns null if not authenticated.
 */
export async function buildFlagContextFromSession(): Promise<FlagEvaluationContext | null> {
  try {
    const ctx = await getActorUserAuthContext();
    if (!ctx) return null;
    return {
      userId: ctx.userId,
      role: ctx.isPlatformAdmin ? "PLATFORM_ADMIN" : undefined,
      portal: "admin",
    };
  } catch {
    return null;
  }
}
