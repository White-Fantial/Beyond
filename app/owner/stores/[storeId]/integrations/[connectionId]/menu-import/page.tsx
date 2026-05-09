import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";
import { listOwnerMenuImportRuns } from "@/services/owner/owner-menu-imports.service";
import { getProviderCapabilities } from "@/domains/integration/provider-capabilities";
import MenuImportPanel from "@/components/owner/integrations/MenuImportPanel";

interface Props {
  params: Promise<{ storeId: string; connectionId: string }>;
}

export default async function OwnerIntegrationMenuImportPage({ params }: Props) {
  const { storeId, connectionId } = await params;
  const ctx = await requireOwnerStoreAccess(storeId);

  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: {
      id: true,
      tenantId: true,
      storeId: true,
      provider: true,
      displayName: true,
      status: true,
    },
  });

  if (!connection || connection.storeId !== storeId) {
    notFound();
  }

  const actorTenantIds = new Set(ctx.tenantMemberships.map((m) => m.tenantId));
  if (!actorTenantIds.has(connection.tenantId) && !ctx.isPlatformAdmin) {
    notFound();
  }

  const capabilities = getProviderCapabilities(connection.provider);
  if (!capabilities.supportsMenuImport) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <p className="text-sm text-gray-500">This provider does not support menu import.</p>
        <Link
          href={`/owner/stores/${storeId}/integrations`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to integrations
        </Link>
      </div>
    );
  }

  const runs = await listOwnerMenuImportRuns({
    tenantId: connection.tenantId,
    connectionId: connection.id,
    limit: 10,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <div className="text-sm text-gray-500">
          <Link href={`/owner/stores/${storeId}/integrations`} className="hover:underline">
            Integrations
          </Link>
          <span className="mx-2">/</span>
          <span>{connection.displayName ?? connection.provider}</span>
          <span className="mx-2">/</span>
          <span className="text-gray-700">Menu Import</span>
        </div>

        <h1 className="text-xl font-bold text-gray-900">Import POS Menu to Product Catalog</h1>
        <p className="text-sm text-gray-500">
          Provider: <span className="font-medium text-gray-700">{connection.provider}</span>
        </p>
      </div>

      <MenuImportPanel
        storeId={storeId}
        connectionId={connection.id}
        provider={connection.provider}
        initialRuns={runs}
      />
    </div>
  );
}
