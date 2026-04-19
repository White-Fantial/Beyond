import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminLogDetail } from "@/services/admin/admin-log.service";
import AdminLogDetailHeader from "@/components/admin/logs/AdminLogDetailHeader";
import AdminLogMetadataViewer from "@/components/admin/logs/AdminLogMetadataViewer";
import AdminLogPayloadViewer from "@/components/admin/logs/AdminLogPayloadViewer";
import AdminLogContextLinks from "@/components/admin/logs/AdminLogContextLinks";
import AdminKeyValueList from "@/components/admin/AdminKeyValueList";

interface PageProps {
  params: { logType: string; logId: string };
}

export default async function AdminLogDetailPage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { logType, logId } = params;

  const log = await getAdminLogDetail(logType, logId);
  if (!log) notFound();

  // Build key-value context rows depending on log type
  const contextRows = buildContextRows(log);

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Link href="/admin/logs" className="text-xs text-gray-400 hover:underline">
          ← Back to Logs
        </Link>
      </div>

      {/* Header: log type badge, severity, title, timestamp */}
      <AdminLogDetailHeader log={log} />

      <div className="space-y-4">
        {/* Context section */}
        {contextRows.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Context</h2>
            <AdminKeyValueList items={contextRows} />
          </div>
        )}

        {/* Source-specific detail sections */}
        {log.logType === "AUDIT" && (
          <AdminLogMetadataViewer title="Metadata" data={log.metadata} />
        )}

        {log.logType === "CONNECTION_ACTION" && (
          <AdminLogPayloadViewer title="Payload" data={log.payload} />
        )}

        {log.logType === "WEBHOOK" && (
          <>
            <AdminLogPayloadViewer title="Request Headers" data={log.requestHeaders} />
            <AdminLogPayloadViewer title="Request Body" data={log.requestBody} />
          </>
        )}

        {log.logType === "ORDER_EVENT" && (
          <AdminLogPayloadViewer title="Payload" data={log.payload} />
        )}

        {/* Context links (related entity navigation) */}
        <AdminLogContextLinks log={log} />
      </div>
    </div>
  );
}

// ─── Context row builder ──────────────────────────────────────────────────────

type KVItem = { label: string; value: string };

function buildContextRows(log: Awaited<ReturnType<typeof getAdminLogDetail>>): KVItem[] {
  if (!log) return [];

  const rows: KVItem[] = [];

  const add = (label: string, value: string | null | undefined) => {
    if (value) rows.push({ label, value });
  };

  add("Log ID", log.id);
  add("Log Type", log.logType);

  if (log.tenantId) add("Tenant ID", log.tenantId);
  if (log.tenantName) add("Tenant", log.tenantName);
  if (log.storeId) add("Store ID", log.storeId);
  if (log.storeName) add("Store", log.storeName);

  switch (log.logType) {
    case "AUDIT":
      add("Action", log.action);
      add("Target Type", log.targetType);
      add("Target ID", log.targetId);
      add("Actor User ID", log.actorUserId);
      if (log.actorUserName) add("Actor", `${log.actorUserName} (${log.actorUserEmail ?? ""})`);
      break;

    case "CONNECTION_ACTION":
      add("Provider", log.provider);
      add("Action Type", log.actionType);
      add("Status", log.status);
      add("Connection ID", log.connectionId);
      add("Actor User ID", log.actorUserId);
      add("Message", log.message);
      add("Error Code", log.errorCode);
      break;

    case "WEBHOOK":
      add("Channel Type", log.channelType);
      add("Event Name", log.eventName);
      add("External Event Ref", log.externalEventRef);
      add("Delivery ID", log.deliveryId);
      if (log.signatureValid !== null && log.signatureValid !== undefined) {
        add("Signature Valid", log.signatureValid ? "Yes" : "No");
      }
      add("Processing Status", log.processingStatus);
      add("Connection ID", log.connectionId);
      add(
        "Processed At",
        log.processedAt
          ? new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "medium",
              hour12: false,
            }).format(new Date(log.processedAt))
          : null
      );
      add("Error", log.errorMessage);
      break;

    case "ORDER_EVENT":
      add("Event Type", log.eventType);
      add("Channel Type", log.channelType);
      add("Order ID", log.orderId);
      add("Connection ID", log.connectionId);
      add("Message", log.message);
      break;
  }

  return rows;
}
