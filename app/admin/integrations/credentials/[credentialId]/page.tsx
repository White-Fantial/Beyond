import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getProviderAppCredential } from "@/services/admin/admin-provider-credentials.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminKeyValueList from "@/components/admin/AdminKeyValueList";
import StatusBadge from "@/components/admin/StatusBadge";
import ProviderAppCredentialForm from "@/components/admin/ProviderAppCredentialForm";

interface PageProps {
  params: Promise<{ credentialId: string }>;
}

export default async function ProviderAppCredentialDetailPage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { credentialId } = await params;
  const cred = await getProviderAppCredential(credentialId);

  return (
    <div>
      <div className="mb-2">
        <Link
          href="/admin/integrations/credentials"
          className="text-xs text-gray-400 hover:underline"
        >
          ← Back to App Credentials
        </Link>
      </div>

      <AdminPageHeader
        title={cred.displayName}
        description={`${cred.provider} · ${cred.environment} · ${cred.authScheme}`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Status</div>
          <StatusBadge value={cred.isActive ? "ACTIVE" : "INACTIVE"} />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Connections</div>
          <span className="text-sm font-semibold text-gray-900">{cred.connectionCount}</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Client Secret</div>
          <span className="text-sm text-gray-700">{cred.hasClientSecret ? "••••••••" : "—"}</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Webhook Secret</div>
          <span className="text-sm text-gray-700">
            {cred.hasWebhookSecret ? "••••••••" : "—"}
          </span>
        </div>
      </div>

      {/* Read-only info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Credential Info</h2>
        <AdminKeyValueList
          items={[
            { label: "ID", value: <span className="font-mono text-xs">{cred.id}</span> },
            { label: "Provider", value: <span className="font-mono text-xs">{cred.provider}</span> },
            {
              label: "Environment",
              value: (
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    cred.environment === "PRODUCTION"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {cred.environment}
                </span>
              ),
            },
            { label: "Auth Scheme", value: <span className="font-mono text-xs">{cred.authScheme}</span> },
            {
              label: "Tenant",
              value: cred.tenantId ? (
                <Link href={`/admin/tenants/${cred.tenantId}`} className="text-blue-600 hover:underline font-mono text-xs">
                  {cred.tenantId}
                </Link>
              ) : (
                <span className="italic text-gray-400 text-xs">Platform-level (all tenants)</span>
              ),
            },
            ...(cred.clientId
              ? [{ label: "Client ID", value: <span className="font-mono text-xs">{cred.clientId}</span> }]
              : []),
            ...(cred.keyId
              ? [{ label: "Key ID", value: <span className="font-mono text-xs">{cred.keyId}</span> }]
              : []),
            ...(cred.developerId
              ? [{ label: "Developer ID", value: <span className="font-mono text-xs">{cred.developerId}</span> }]
              : []),
            {
              label: "Scopes",
              value:
                cred.scopes.length > 0 ? (
                  <span className="font-mono text-xs text-gray-600">{cred.scopes.join(", ")}</span>
                ) : (
                  <span className="text-gray-400 italic text-xs">None</span>
                ),
            },
            {
              label: "Active Connections",
              value: (
                <Link
                  href={`/admin/integrations?provider=${cred.provider}`}
                  className="text-blue-600 hover:underline text-xs"
                >
                  {cred.connectionCount} connection{cred.connectionCount !== 1 ? "s" : ""}
                </Link>
              ),
            },
            { label: "Created", value: cred.createdAt.toLocaleString("en-US") },
            { label: "Updated", value: cred.updatedAt.toLocaleString("en-US") },
          ]}
        />
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Edit Credential</h2>
        <ProviderAppCredentialForm
          credentialId={cred.id}
          initialValues={{
            displayName: cred.displayName,
            provider: cred.provider,
            environment: cred.environment,
            authScheme: cred.authScheme,
            tenantId: cred.tenantId ?? "",
            clientId: cred.clientId ?? "",
            keyId: cred.keyId ?? "",
            developerId: cred.developerId ?? "",
            scopes: cred.scopes.join(" "),
            isActive: cred.isActive,
            hasClientSecret: cred.hasClientSecret,
            hasWebhookSecret: cred.hasWebhookSecret,
          }}
        />
      </div>
    </div>
  );
}
