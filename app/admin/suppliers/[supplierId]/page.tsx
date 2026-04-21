import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getPlatformSupplierDetail } from "@/services/admin/admin-suppliers.service";
import AdminSupplierDetailPanel from "@/components/admin/AdminSupplierDetailPanel";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ supplierId: string }>;
}

export default async function AdminSupplierDetailPage({ params }: Props) {
  await requirePlatformAdmin();
  const { supplierId } = await params;

  try {
    const supplier = await getPlatformSupplierDetail(supplierId);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/suppliers"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Platform Suppliers
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">{supplier.name}</h1>
        </div>
        <AdminSupplierDetailPanel supplier={supplier} />
      </div>
    );
  } catch {
    notFound();
  }
}
