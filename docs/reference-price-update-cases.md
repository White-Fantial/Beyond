# Supplier project: when `referencePrice` is updated

`SupplierProduct.referencePrice` changes in the following code paths.

## 1) Owner: single-product unauthenticated scrape
- Function: `scrapeSupplierProduct(tenantId, supplierProductId)`
- Behavior: scrapes a supplier product URL and updates `supplierProduct.referencePrice` to the scraped price (or keeps previous value if scrape result has no price).
- Triggered by API route: `POST /api/owner/suppliers/[supplierId]/products/[productId]/scrape`

## 2) Owner: credentialed user scraping flow
- Function: `scrapeForUser(tenantId, userId)`
- Behavior: for each scraped product, appends a `SupplierPriceRecord` and then calls `recomputeReferencePrice(product.id)`.
- `recomputeReferencePrice` sets `referencePrice` using:
  1. latest platform-scraped record (`tenantId = PLATFORM_SCRAPER_TENANT_ID`), else
  2. latest record across any tenant.
- Triggered by API route: `POST /api/owner/scrape/user`

## 3) Owner: base-price reconciliation for one product
- Function: `scrapeAllUsersForProduct(tenantId, supplierProductId)`
- Behavior: runs `scrapeForUser` for all users with credentials for that product's supplier, which can update `referencePrice` through recomputation.
- Triggered by API route: `POST /api/owner/scrape/base-price/[productId]`

## 4) Cron/Admin: platform-wide scraping
- Function: `scrapeAllPlatformProducts()`
- Behavior: scrapes each platform supplier product, writes a platform `SupplierPriceRecord`, then directly updates `supplierProduct.referencePrice` to the scraped price.
- Triggered by API routes:
  - `POST /api/cron/scrape-platform`
  - `POST /api/admin/scrape/platform`

## 5) Cron: credentialed scraping for all tenant/user pairs
- Function: `scrapeAllTenantsCredentialed()`
- Behavior: iterates all active credential tenant/user pairs and runs `scrapeForUser`, which can update `referencePrice` via recomputation.
- Triggered by API route: `POST /api/cron/scrape-credentialed`

## 6) Admin manual edit of supplier product
- Function: `updatePlatformSupplierProduct(supplierId, productId, input)`
- Behavior: if `input.referencePrice` is provided, it directly updates `supplierProduct.referencePrice`.
- Triggered by API route: `PATCH /api/admin/suppliers/[supplierId]/products/[productId]`

## 7) Admin bulk import of supplier products
- Function: `importPlatformSupplierProducts(supplierId, rows)`
- Behavior: each imported/updated row writes `referencePrice` from import data.
- Triggered by API route: `POST /api/admin/suppliers/[supplierId]/products/import`

## 8) Admin create supplier product
- Function: `createPlatformSupplierProduct(supplierId, input)`
- Behavior: initializes `referencePrice` (provided input or `0`) at creation time.
- Triggered by API route: `POST /api/admin/suppliers/[supplierId]/products`

---

## Not an update by itself (read-only usage)
These code paths consume `referencePrice` as fallback/snapshot, but do not update it:
- `services/owner/owner-supplier-prices.service.ts`
- `services/owner/owner-recipes.service.ts`
- `services/marketplace/recipe-marketplace.service.ts`
