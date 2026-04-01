"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ImpersonationPayload } from "@/lib/auth/impersonation";

interface Props {
  state: Pick<
    ImpersonationPayload,
    "actorEmail" | "actorName" | "effectiveName" | "effectiveEmail" | "startedAt"
  >;
}

export default function ImpersonationBannerClient({ state }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const startedAt = new Date(state.startedAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  async function handleExit() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/impersonate", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to exit impersonation");
        return;
      }
      const data = (await res.json()) as { redirectUrl?: string };
      router.push(data.redirectUrl ?? "/admin");
      router.refresh();
    });
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-amber-950 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
          <span className="font-semibold shrink-0">👁 Impersonation active</span>
          <span className="truncate">
            Viewing as{" "}
            <span className="font-bold">
              {state.effectiveName} ({state.effectiveEmail})
            </span>
          </span>
          <span className="text-amber-800 truncate hidden sm:inline">
            Signed in as admin: {state.actorEmail}
          </span>
          <span className="text-amber-800 text-xs truncate hidden md:inline">
            Started at {startedAt}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {error && <span className="text-red-800 text-xs">{error}</span>}
          <button
            onClick={handleExit}
            disabled={isPending}
            className="px-3 py-1 bg-amber-950 text-amber-50 rounded text-xs font-semibold hover:bg-amber-900 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            {isPending ? "Exiting…" : "Exit impersonation"}
          </button>
        </div>
      </div>
    </div>
  );
}
