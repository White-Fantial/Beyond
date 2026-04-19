/**
 * Sync Dashboard Page — Phase 7.
 *
 * Located at:
 *   /owner/stores/[storeId]/integrations/[connectionId]/sync
 *
 * Shows the policy-based two-way sync dashboard with:
 *   - Summary cards (Open changes, Open conflicts, Ready, Blocked, Failed, Last sync)
 *   - Tab navigation: Preview | Ready | Blocked | History | Policies
 *   - Plan item tables per tab
 *   - Build Sync Plan and Apply All Ready action buttons
 *   - Policy configuration table
 */

import { prisma } from "@/lib/prisma";
import { getSyncInboxSummary } from "@/services/catalog-sync-executor.service";
import {
  getSyncPoliciesForConnection,
  getSyncPlan,
  listSyncPlans,
} from "@/services/catalog-sync-planner.service";
import SyncSummaryCard from "@/components/owner/catalog/sync/SyncSummaryCard";
import SyncPlanItemTable from "@/components/owner/catalog/sync/SyncPlanItemTable";
import SyncPolicyTable from "@/components/owner/catalog/sync/SyncPolicyTable";
import Link from "next/link";
import type { CatalogSyncPlanItemDto } from "@/types/catalog-sync";

interface PageProps {
  params: Promise<{ storeId: string; connectionId: string }>;
  searchParams: { tab?: string };
}

export default async function SyncPage({ params, searchParams }: PageProps) {
  const { storeId, connectionId } = await params;
  const tab = searchParams.tab ?? "preview";

  const [connection, summary, policies, plans] = await Promise.all([
    prisma.connection.findUnique({
      where: { id: connectionId },
      select: { id: true, provider: true, displayName: true },
    }),
    getSyncInboxSummary(connectionId),
    getSyncPoliciesForConnection(connectionId),
    listSyncPlans({ connectionId, limit: 10 }),
  ]);

  // Load active plan details
  const activePlan = summary.activePlanId
    ? await getSyncPlan(summary.activePlanId)
    : plans[0]
    ? await getSyncPlan(plans[0].id)
    : null;

  const allItems: CatalogSyncPlanItemDto[] = activePlan?.items ?? [];
  const readyItems    = allItems.filter((i) => i.status === "READY");
  const blockedItems  = allItems.filter((i) => i.status === "BLOCKED");
  const historyItems  = allItems.filter((i) => i.status === "APPLIED" || i.status === "FAILED" || i.status === "SKIPPED");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/owner/stores/${storeId}`} className="hover:text-gray-800">Store</Link>
        <span>/</span>
        <Link
          href={`/owner/stores/${storeId}/integrations/${connectionId}/mapping`}
          className="hover:text-gray-800"
        >
          {connection?.displayName ?? connection?.provider ?? connectionId}
        </Link>
        <span>/</span>
        <span className="text-gray-800">Sync Dashboard</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Policy-based two-way sync between the Beyond catalog and{" "}
            <span className="font-medium">{connection?.provider ?? connectionId}</span>.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <form method="POST" action="/api/catalog/sync/plans/build">
            <input type="hidden" name="connectionId" value={connectionId} />
            <button
              type="submit"
              className="text-sm px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50"
            >
              Build Sync Plan
            </button>
          </form>
          {activePlan && (
            <form method="POST" action={`/api/catalog/sync/plans/${activePlan.id}/apply`}>
              <button
                type="submit"
                className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Apply All Ready
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <SyncSummaryCard summary={summary} />

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 text-sm">
          {(["preview", "ready", "blocked", "history", "policies"] as const).map((t) => (
            <Link
              key={t}
              href={`/owner/stores/${storeId}/integrations/${connectionId}/sync?tab=${t}`}
              className={`pb-2 border-b-2 capitalize ${
                tab === t
                  ? "border-blue-600 text-blue-600 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
              {t === "ready"   && readyItems.length   > 0 && <span className="ml-1 text-xs text-green-600">({readyItems.length})</span>}
              {t === "blocked" && blockedItems.length  > 0 && <span className="ml-1 text-xs text-orange-600">({blockedItems.length})</span>}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === "preview" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Plan Preview
            {activePlan && <span className="ml-2 text-xs font-normal text-gray-400">Plan: {activePlan.id.slice(0, 8)}</span>}
          </h2>
          <SyncPlanItemTable items={allItems} emptyMessage="No plan items. Build a sync plan to get started." />
        </div>
      )}

      {tab === "ready" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Ready to Apply</h2>
          <SyncPlanItemTable items={readyItems} emptyMessage="No ready items." />
        </div>
      )}

      {tab === "blocked" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Blocked Items</h2>
          <p className="text-sm text-gray-500">
            These items cannot be applied automatically. Resolve the linked conflict or update the sync policy.
          </p>
          <SyncPlanItemTable items={blockedItems} emptyMessage="No blocked items." />
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">History</h2>
          <SyncPlanItemTable items={historyItems} emptyMessage="No applied or failed items yet." />
        </div>
      )}

      {tab === "policies" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Sync Policies</h2>
          <p className="text-sm text-gray-500">
            Explicit policies override the built-in defaults. Lower priority number = higher precedence.
          </p>
          <SyncPolicyTable policies={policies} />
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-4 text-sm pt-4 border-t border-gray-100">
        <Link
          href={`/owner/stores/${storeId}/integrations/${connectionId}/external-changes`}
          className="text-blue-600 hover:underline"
        >
          ← External Changes
        </Link>
        <Link
          href={`/owner/stores/${storeId}/integrations/${connectionId}/conflicts`}
          className="text-blue-600 hover:underline"
        >
          Conflict Center
        </Link>
        <Link
          href={`/owner/stores/${storeId}/integrations/${connectionId}/mapping`}
          className="text-blue-600 hover:underline"
        >
          Mapping →
        </Link>
      </div>
    </div>
  );
}
