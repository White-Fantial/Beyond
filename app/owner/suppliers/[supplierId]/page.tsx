import { requireAuth } from "@/lib/auth/permissions";
import { getSupplierDetail } from "@/services/owner/owner-suppliers.service";
import { listCredentials } from "@/services/owner/owner-supplier-credentials.service";
import SupplierDetailView from "@/components/owner/suppliers/SupplierDetailView";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ supplierId: string }>;
}

export default async function SupplierDetailPage({ params }: Props) {
  const { supplierId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const userId = ctx.userId;

  try {
    const [supplier, allCredentials] = await Promise.all([
      getSupplierDetail(tenantId, supplierId),
      listCredentials(tenantId, userId),
    ]);
    const credential = allCredentials.find((c) => c.supplierId === supplierId) ?? null;

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
        <SupplierDetailView supplier={supplier} credential={credential} />
      </div>
    );
  } catch {
    notFound();
  }
}
