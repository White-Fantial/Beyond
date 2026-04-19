import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { getSelectableStores } from "@/lib/customer-store-context";
import { StoreSelector } from "./StoreSelector";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function SelectStorePage({ params }: Props) {
  await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const { tenantSlug } = await params;

  const data = await getSelectableStores(tenantSlug);
  if (!data) notFound();

  // Edge case: if only one store, the layout should have auto-selected it.
  // We still render the page in case the customer manually navigates here.
  return (
    <StoreSelector
      tenantSlug={tenantSlug}
      tenantName={data.tenant.name}
      stores={data.stores}
      returnPath={`/${tenantSlug}/app`}
    />
  );
}
