import { requireAuth } from "@/lib/auth/permissions";
import { getWebhookEndpointDetail } from "@/services/owner/owner-webhooks.service";
import { notFound } from "next/navigation";
import WebhookEndpointDetailView from "@/components/owner/webhooks/WebhookEndpointDetailView";

interface Props {
  params: { endpointId: string };
}

export default async function WebhookEndpointDetailPage({ params }: Props) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const detail = await getWebhookEndpointDetail(tenantId, params.endpointId);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Webhook Endpoint</h1>
          <p className="text-sm font-mono text-gray-500 mt-0.5 truncate">{detail.url}</p>
        </div>
        <WebhookEndpointDetailView detail={detail} />
      </div>
    );
  } catch {
    notFound();
  }
}
