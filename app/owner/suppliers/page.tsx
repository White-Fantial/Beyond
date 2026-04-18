import { requireAuth } from "@/lib/auth/permissions";
import { listSuppliers } from "@/services/owner/owner-suppliers.service";
import SupplierTable from "@/components/owner/suppliers/SupplierTable";
import AddSupplierForm from "@/components/owner/suppliers/AddSupplierForm";

export default async function OwnerSuppliersPage() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const storeId = ctx.storeMemberships[0]?.storeId ?? "";

  const result = await listSuppliers(tenantId, { storeId });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result.total} supplier{result.total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <AddSupplierForm storeId={storeId} />
      <SupplierTable items={result.items} />
    </div>
  );
}
