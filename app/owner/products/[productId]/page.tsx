import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { getTenantProduct } from "@/services/owner/owner-tenant-products.service";
import { getTenantProductRecipes } from "@/services/owner/owner-recipes.service";
import { getOwnerStores } from "@/services/owner/owner-store.service";
import { notFound } from "next/navigation";
import Link from "next/link";
import TenantProductEditForm from "@/components/owner/products/TenantProductEditForm";
import TenantProductRecipeSection from "@/components/owner/products/TenantProductRecipeSection";

interface Props {
  params: Promise<{ productId: string }>;
}

export default async function TenantProductDetailPage({ params }: Props) {
  const { productId } = await params;
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const [product, stores, recipes] = await Promise.all([
    getTenantProduct(tenantId, productId),
    tenantId ? getOwnerStores(tenantId) : [],
    tenantId ? getTenantProductRecipes(tenantId, productId) : [],
  ]);
  if (!product) notFound();

  const storeOptions = stores.map((s) => ({ id: s.id, name: s.name }));

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

      {/* Recipe management */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Recipe &amp; Cost</h2>
        </div>
        <TenantProductRecipeSection
          tenantProductId={productId}
          stores={storeOptions}
          allRecipes={recipes}
        />
      </div>
    </div>
  );
}
