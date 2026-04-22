import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getPlatformSupplierDetail } from "@/services/admin/admin-suppliers.service";
import AdminSupplierEditForm from "@/components/admin/AdminSupplierEditForm";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ supplierId: string }>;
}

export default async function AdminSupplierEditPage({ params }: Props) {
  await requirePlatformAdmin();
  const { supplierId } = await params;

  try {
    const supplier = await getPlatformSupplierDetail(supplierId);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/admin/suppliers"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Platform Suppliers
          </Link>
          <span className="text-gray-300">/</span>
          <Link
            href={`/admin/suppliers/${supplierId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {supplier.name}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-800 font-medium">Edit</span>
        </div>
        <AdminSupplierEditForm supplier={supplier} />
      </div>
    );
  } catch {
    notFound();
  }
}
