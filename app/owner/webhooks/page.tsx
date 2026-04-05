import { requireAuth } from "@/lib/auth/permissions";
import { listWebhookEndpoints } from "@/services/owner/owner-webhooks.service";
import WebhookEndpointTable from "@/components/owner/webhooks/WebhookEndpointTable";
import AddWebhookEndpointForm from "@/components/owner/webhooks/AddWebhookEndpointForm";

export default async function OwnerWebhooksPage() {
  const ctx = await requireAuth();
  const result = await listWebhookEndpoints(ctx.tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result.total} endpoint{result.total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <AddWebhookEndpointForm />
      <WebhookEndpointTable items={result.items} />
    </div>
  );
}
