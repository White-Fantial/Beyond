import { requireAuth } from "@/lib/auth/permissions";
import { getSupplierDetail } from "@/services/owner/owner-suppliers.service";
import SupplierDetailView from "@/components/owner/suppliers/SupplierDetailView";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: { supplierId: string };
}

export default async function SupplierDetailPage({ params }: Props) {
  const { supplierId } = params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const supplier = await getSupplierDetail(tenantId, supplierId);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/owner/suppliers"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Suppliers
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">{supplier.name}</h1>
        </div>
        <SupplierDetailView supplier={supplier} />
      </div>
    );
  } catch {
    notFound();
  }
}
