import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ProviderAppCredentialForm from "@/components/admin/ProviderAppCredentialForm";

export default async function NewProviderAppCredentialPage() {
  await requirePlatformAdmin();

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
        title="New Provider App Credential"
        description="Register a new OAuth app or API key credential. Secrets are encrypted with AES-256-GCM before storage and are never returned to the client."
      />

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
        <ProviderAppCredentialForm />
      </div>
    </div>
  );
}
