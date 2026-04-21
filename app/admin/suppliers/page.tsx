import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listPlatformSuppliers } from "@/services/admin/admin-suppliers.service";
import AdminPlatformSupplierPanel from "@/components/admin/AdminPlatformSupplierPanel";

export default async function AdminSuppliersPage() {
  await requirePlatformAdmin();
  const result = await listPlatformSuppliers(1, 100);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Platform Suppliers</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage the global supplier catalogue. Owners can browse these suppliers and
          attach credentials to them.
        </p>
      </div>
      <AdminPlatformSupplierPanel initialResult={result} />
    </div>
  );
}
