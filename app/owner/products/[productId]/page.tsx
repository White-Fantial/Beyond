import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { getTenantProduct } from "@/services/owner/owner-tenant-products.service";
import { notFound } from "next/navigation";
import Link from "next/link";
import TenantProductEditForm from "@/components/owner/products/TenantProductEditForm";

interface Props {
  params: Promise<{ productId: string }>;
}

export default async function TenantProductDetailPage({ params }: Props) {
  const { productId } = await params;
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const product = await getTenantProduct(tenantId, productId);
  if (!product) notFound();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/owner/products" className="hover:text-gray-700">
          ← Product Catalog
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-800 font-medium">{product.name}</span>
      </div>

      <TenantProductEditForm product={product} />

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
        <strong>Store assignment:</strong> To assign this product to a specific store, go to that
        store&apos;s{" "}
        <strong>Products</strong> page and use the <strong>Add from Catalog</strong> button.
      </div>
    </div>
  );
}
