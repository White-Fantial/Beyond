-- CreateTable
CREATE TABLE "recipe_product_components" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "tenantProductId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit" "IngredientUnit" NOT NULL DEFAULT 'EACH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_product_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipe_product_components_recipeId_tenantProductId_key" ON "recipe_product_components"("recipeId", "tenantProductId");

-- CreateIndex
CREATE INDEX "recipe_product_components_recipeId_idx" ON "recipe_product_components"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_product_components_tenantProductId_idx" ON "recipe_product_components"("tenantProductId");

-- AddForeignKey
ALTER TABLE "recipe_product_components" ADD CONSTRAINT "recipe_product_components_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_product_components" ADD CONSTRAINT "recipe_product_components_tenantProductId_fkey" FOREIGN KEY ("tenantProductId") REFERENCES "tenant_catalog_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
