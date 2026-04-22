import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getPlatformSupplierDetail, getPlatformSupplierProduct } from "@/services/admin/admin-suppliers.service";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminSupplierProductEditForm from "./AdminSupplierProductEditForm";

interface Props {
  params: Promise<{ supplierId: string; productId: string }>;
}

export default async function AdminSupplierProductEditPage({ params }: Props) {
  await requirePlatformAdmin();
  const { supplierId, productId } = await params;

  try {
    const [supplier, product] = await Promise.all([
      getPlatformSupplierDetail(supplierId),
      getPlatformSupplierProduct(supplierId, productId),
    ]);

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
          <Link
            href={`/admin/suppliers/${supplierId}/products/${productId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {product.name}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-800 font-medium">Edit</span>
        </div>
        <AdminSupplierProductEditForm supplierId={supplierId} product={product} />
      </div>
    );
  } catch {
    notFound();
  }
}
