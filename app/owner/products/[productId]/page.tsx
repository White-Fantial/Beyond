import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { getTenantProduct } from "@/services/owner/owner-tenant-products.service";
import { getTenantProductRecipes } from "@/services/owner/owner-recipes.service";
import {
  listProductModifierGroups,
  listTenantModifierGroups,
} from "@/services/owner/owner-tenant-modifiers.service";
import { notFound } from "next/navigation";
import Link from "next/link";
import TenantProductEditForm from "@/components/owner/products/TenantProductEditForm";
import TenantProductRecipeSection from "@/components/owner/products/TenantProductRecipeSection";
import ProductModifierGroupSection from "@/components/owner/products/ProductModifierGroupSection";

interface Props {
  params: Promise<{ productId: string }>;
}

export default async function TenantProductDetailPage({ params }: Props) {
  const { productId } = await params;
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const [product, recipes, linkedModifiers, allModifiers] = await Promise.all([
    getTenantProduct(tenantId, productId),
    tenantId ? getTenantProductRecipes(tenantId, productId) : [],
    tenantId ? listProductModifierGroups(tenantId, productId) : [],
    tenantId ? listTenantModifierGroups(tenantId) : [],
  ]);
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

      {/* Modifier Groups */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Modifier Groups</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Add modifier groups (e.g. Size, Add-ons) to this product and set their order.{" "}
              <Link href="/owner/products/modifiers" className="text-brand-600 hover:underline">
                Manage modifier groups →
              </Link>
            </p>
          </div>
        </div>
        <ProductModifierGroupSection
          tenantProductId={productId}
          linkedGroups={linkedModifiers}
          allGroups={allModifiers}
        />
      </div>

      {/* Recipe management */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Recipe &amp; Cost</h2>
        </div>
        <TenantProductRecipeSection
          tenantProductId={productId}
          allRecipes={recipes}
        />
      </div>
    </div>
  );
}
