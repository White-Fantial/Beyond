import Link from "next/link";
import { requireAuth } from "@/lib/auth/permissions";
import { listAvailableSuppliers } from "@/services/owner/owner-suppliers.service";
import OwnerInvoiceImportClient from "@/components/owner/suppliers/OwnerInvoiceImportClient";

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function OwnerSupplierInvoiceImportPage({ searchParams }: Props) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const params = await searchParams;
  const initialSupplierId = firstParam(params?.supplierId);
  const suppliers = await listAvailableSuppliers(tenantId, { pageSize: 200 });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/owner/suppliers" className="text-sm text-gray-500 hover:text-gray-700">
          ← Suppliers
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Import Supplier Invoice</h1>
      </div>

      <p className="text-sm text-gray-500">
        Select a supplier, upload an invoice, review row matches, then confirm price updates.
        Updates are saved as invoice-import price records instead of overwriting existing history.
      </p>

      <OwnerInvoiceImportClient
        suppliers={suppliers.items}
        initialSupplierId={initialSupplierId}
      />
    </div>
  );
}
