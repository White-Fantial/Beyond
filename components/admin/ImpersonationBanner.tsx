import { getImpersonationState } from "@/lib/auth/impersonation";
import ImpersonationBannerClient from "./ImpersonationBannerClient";

/**
 * Server component that renders the impersonation banner when a PLATFORM_ADMIN
 * is currently impersonating another user. Reads the impersonation cookie on the
 * server so the banner is available on the very first render with no layout shift.
 *
 * Mount this in the root layout so it appears across ALL portals.
 */
export default async function ImpersonationBanner() {
  const state = await getImpersonationState();
  if (!state) return null;

  return (
    <ImpersonationBannerClient
      state={{
        actorEmail: state.actorEmail,
        actorName: state.actorName,
        effectiveName: state.effectiveName,
        effectiveEmail: state.effectiveEmail,
        startedAt: state.startedAt,
      }}
    />
  );
}
