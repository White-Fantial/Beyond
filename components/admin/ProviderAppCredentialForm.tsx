"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const PROVIDER_OPTIONS = [
  { value: "LOYVERSE", label: "Loyverse" },
  { value: "LIGHTSPEED", label: "Lightspeed" },
  { value: "UBER_EATS", label: "Uber Eats" },
  { value: "DOORDASH", label: "DoorDash" },
  { value: "STRIPE", label: "Stripe" },
  { value: "OTHER", label: "Other" },
];

const AUTH_SCHEME_OPTIONS = [
  { value: "OAUTH2", label: "OAuth 2.0" },
  { value: "JWT_BEARER", label: "JWT Bearer" },
  { value: "API_KEY", label: "API Key" },
  { value: "BASIC", label: "Basic Auth" },
  { value: "CUSTOM", label: "Custom" },
];

const ENVIRONMENT_OPTIONS = [
  { value: "PRODUCTION", label: "Production" },
  { value: "SANDBOX", label: "Sandbox" },
];

interface ProviderAppCredentialFormProps {
  /** If provided, renders in "edit" mode and PATCHes instead of POSTing */
  credentialId?: string;
  initialValues?: {
    displayName: string;
    provider: string;
    environment: string;
    authScheme: string;
    tenantId: string;
    clientId: string;
    keyId: string;
    developerId: string;
    scopes: string;
    isActive: boolean;
    hasClientSecret: boolean;
    hasWebhookSecret: boolean;
  };
}

const SECRET_PLACEHOLDER = "••••••••";

export default function ProviderAppCredentialForm({
  credentialId,
  initialValues,
}: ProviderAppCredentialFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEdit = !!credentialId;

  const [form, setForm] = useState({
    displayName: initialValues?.displayName ?? "",
    provider: initialValues?.provider ?? "LOYVERSE",
    environment: initialValues?.environment ?? "PRODUCTION",
    authScheme: initialValues?.authScheme ?? "OAUTH2",
    tenantId: initialValues?.tenantId ?? "",
    clientId: initialValues?.clientId ?? "",
    keyId: initialValues?.keyId ?? "",
    developerId: initialValues?.developerId ?? "",
    scopes: initialValues?.scopes ?? "",
    isActive: initialValues?.isActive ?? true,
    clientSecret: "",
    webhookSecret: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setSuccess(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const scopesList = form.scopes
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const body: Record<string, unknown> = {
      displayName: form.displayName.trim(),
      authScheme: form.authScheme,
      clientId: form.clientId.trim() || null,
      keyId: form.keyId.trim() || null,
      developerId: form.developerId.trim() || null,
      scopes: scopesList,
    };

    if (!isEdit) {
      body.provider = form.provider;
      body.environment = form.environment;
      body.tenantId = form.tenantId.trim() || null;
    }

    if (isEdit) {
      body.isActive = form.isActive;
    }

    // Only send secrets if the user typed something
    if (form.clientSecret && form.clientSecret !== SECRET_PLACEHOLDER) {
      body.clientSecret = form.clientSecret;
    }
    if (form.webhookSecret && form.webhookSecret !== SECRET_PLACEHOLDER) {
      body.webhookSecret = form.webhookSecret;
    }

    startTransition(async () => {
      try {
        const url = isEdit
          ? `/api/admin/provider-app-credentials/${credentialId}`
          : "/api/admin/provider-app-credentials";
        const method = isEdit ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Request failed.");
          return;
        }

        setSuccess(true);
        if (!isEdit && data.id) {
          router.push(`/admin/integrations/credentials/${data.id}`);
          router.refresh();
        } else {
          router.refresh();
        }
      } catch {
        setError("A network error occurred. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Provider / Environment — read-only in edit mode */}
      {!isEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Provider *">
            <select name="provider" value={form.provider} onChange={handleChange} className={inputCls}>
              {PROVIDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Environment *">
            <select name="environment" value={form.environment} onChange={handleChange} className={inputCls}>
              {ENVIRONMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <Field label="Display Name *" hint="Human-readable label shown in the admin console.">
        <input
          name="displayName"
          value={form.displayName}
          onChange={handleChange}
          required
          className={inputCls}
          placeholder="e.g. Loyverse Production App"
        />
      </Field>

      <Field label="Auth Scheme *">
        <select name="authScheme" value={form.authScheme} onChange={handleChange} className={inputCls}>
          {AUTH_SCHEME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      {!isEdit && (
        <Field
          label="Tenant ID"
          hint="Leave blank for a platform-level credential used by all tenants."
        >
          <input
            name="tenantId"
            value={form.tenantId}
            onChange={handleChange}
            className={inputCls}
            placeholder="(optional) cuid of the specific tenant"
          />
        </Field>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Client ID" hint="OAuth client_id (stored as plaintext).">
          <input
            name="clientId"
            value={form.clientId}
            onChange={handleChange}
            className={inputCls}
            placeholder="(optional)"
          />
        </Field>

        <Field label="Key ID" hint="JWT kid / DoorDash key_id (stored as plaintext).">
          <input
            name="keyId"
            value={form.keyId}
            onChange={handleChange}
            className={inputCls}
            placeholder="(optional)"
          />
        </Field>
      </div>

      <Field label="Developer ID" hint="DoorDash developer_id (stored as plaintext).">
        <input
          name="developerId"
          value={form.developerId}
          onChange={handleChange}
          className={inputCls}
          placeholder="(optional)"
        />
      </Field>

      <Field
        label="Scopes"
        hint="Space- or comma-separated OAuth scopes (e.g. read.items manage.deliveries)."
      >
        <input
          name="scopes"
          value={form.scopes}
          onChange={handleChange}
          className={inputCls}
          placeholder="(optional)"
        />
      </Field>

      {/* Secrets — always encrypted; show placeholder if already set */}
      <div className="border border-amber-200 rounded-lg p-4 bg-amber-50 space-y-4">
        <div className="text-xs font-semibold text-amber-800 mb-1">
          🔒 Secrets — encrypted with AES-256-GCM before storage. Leave blank to keep the existing value.
        </div>

        <Field
          label={
            isEdit && initialValues?.hasClientSecret
              ? "Client Secret (currently set — enter new value to replace)"
              : "Client Secret"
          }
          hint="OAuth client_secret, DoorDash signing key, or Stripe secret key."
        >
          <input
            name="clientSecret"
            value={form.clientSecret}
            onChange={handleChange}
            type="password"
            autoComplete="new-password"
            className={inputCls}
            placeholder={
              isEdit && initialValues?.hasClientSecret
                ? "Leave blank to keep current secret"
                : "(optional)"
            }
          />
        </Field>

        <Field
          label={
            isEdit && initialValues?.hasWebhookSecret
              ? "Webhook Secret (currently set — enter new value to replace)"
              : "Webhook Secret"
          }
          hint="Uber Eats / DoorDash webhook signature secret."
        >
          <input
            name="webhookSecret"
            value={form.webhookSecret}
            onChange={handleChange}
            type="password"
            autoComplete="new-password"
            className={inputCls}
            placeholder={
              isEdit && initialValues?.hasWebhookSecret
                ? "Leave blank to keep current secret"
                : "(optional)"
            }
          />
        </Field>
      </div>

      {isEdit && (
        <div className="flex items-center gap-2">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            checked={form.isActive}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">
            Active (credential can be used by the integration engine)
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && isEdit && (
        <p className="text-sm text-green-600 font-medium">Changes saved.</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {isPending
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
            ? "Save Changes"
            : "Create Credential"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60";
