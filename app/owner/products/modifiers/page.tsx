import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { listTenantModifierGroups } from "@/services/owner/owner-tenant-modifiers.service";
import TenantModifierManagerPage from "@/components/owner/products/TenantModifierManagerPage";
import Link from "next/link";

export default async function OwnerProductModifiersPage() {
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const groups = tenantId ? await listTenantModifierGroups(tenantId) : [];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/owner/products"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Products
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Modifier Groups</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Create modifier groups and options (e.g. Size, Add-ons). Assign them to products from the
          product detail page.
        </p>
      </div>

      <TenantModifierManagerPage initialGroups={groups} />
    </div>
  );
}
