"use client";

import type { RecipeDetail } from "@/types/owner-recipes";
import ProductRecipePanel from "@/components/owner/products/ProductRecipePanel";

interface Props {
  tenantProductId: string;
  allRecipes: RecipeDetail[];
}

/**
 * Tenant-level product recipe section.
 *
 * Recipes are now scoped to the tenant (not per-store), so no store picker
 * is needed. Renders a ProductRecipePanel directly.
 */
export default function TenantProductRecipeSection({ tenantProductId, allRecipes }: Props) {
  return (
    <ProductRecipePanel
      tenantCatalogProductId={tenantProductId}
      recipes={allRecipes}
    />
  );
}
