# Supplier Project Database Schema

This document summarizes the supplier-domain database schema defined in `prisma/schema.prisma`.

## Enums

### `SupplierScope`
- `PLATFORM`: Admin-managed supplier shared across all tenants.
- `STORE`: Legacy tenant/store-managed supplier.

### `SupplierRequestStatus`
- `PENDING`
- `APPROVED`
- `REJECTED`
- `DUPLICATE`

### `SupplierPriceSource`
- `MANUAL_ENTRY`
- `SCRAPED`

## Tables (Prisma models)

### `suppliers` (`Supplier`)
- `id` (PK, uuid)
- `scope` (`SupplierScope`, default `STORE`)
- `tenantId` (nullable)
- `storeId` (nullable)
- `name`
- `websiteUrl` (nullable)
- `contactEmail` (nullable)
- `contactPhone` (nullable)
- `notes` (nullable)
- `adapterType` (nullable)
- `createdAt`
- `updatedAt`
- `deletedAt` (nullable, soft delete)

Indexes:
- `(scope)`
- `(tenantId, storeId)`
- `(storeId, name)`

Relations:
- 1:N with `supplier_products`
- 1:N with `supplier_credentials`
- 1:N with `supplier_requests` (as resolved supplier)

---

### `supplier_requests` (`SupplierRequest`)
- `id` (PK, uuid)
- `requestedByUserId` (FK -> `users.id`)
- `tenantId`
- `name`
- `websiteUrl` (nullable)
- `contactEmail` (nullable)
- `contactPhone` (nullable)
- `notes` (nullable)
- `status` (`SupplierRequestStatus`, default `PENDING`)
- `resolvedSupplierId` (nullable, FK -> `suppliers.id`)
- `reviewedByUserId` (nullable, FK -> `users.id`)
- `reviewNotes` (nullable)
- `createdAt`
- `updatedAt`

Indexes:
- `(status)`
- `(tenantId)`
- `(requestedByUserId)`

---

### `supplier_products` (`SupplierProduct`)
- `id` (PK, uuid)
- `supplierId` (FK -> `suppliers.id`)
- `name`
- `externalUrl` (nullable)
- `externalUrlNormalized` (nullable)
- `referencePrice` (int, millicents, default `0`)
- `purchaseQty` (float, default `1`)
- `unit` (`IngredientUnit`, default `EACH`)
- `lastScrapedAt` (nullable)
- `metadata` (json, default `{}`)
- `createdAt`
- `updatedAt`
- `deletedAt` (nullable, soft delete)

Indexes:
- `(supplierId)`
- `(supplierId, externalUrlNormalized)`

Relations:
- N:1 with `suppliers`
- 1:N with `ingredient_supplier_links`
- 1:N with `supplier_contract_prices`
- 1:N with `supplier_price_records`

---

### `ingredient_supplier_links` (`IngredientSupplierLink`)
- `id` (PK, uuid)
- `ingredientId` (FK -> `ingredients.id`)
- `supplierProductId` (FK -> `supplier_products.id`)
- `tenantId` (nullable)
- `isPreferred` (bool, default `false`)
- `createdAt`

Indexes:
- `(ingredientId)`
- `(supplierProductId)`
- `(tenantId)`
- `(ingredientId, supplierProductId, tenantId)`

Notes:
- Partial uniqueness is enforced in migration SQL (not via Prisma `@@unique`) for:
  - platform-level link when `tenantId IS NULL`
  - tenant override when `tenantId IS NOT NULL`

---

### `supplier_credentials` (`SupplierCredential`)
- `id` (PK, uuid)
- `tenantId`
- `userId`
- `supplierId` (FK -> `suppliers.id`)
- `loginUrl` (nullable)
- `username`
- `passwordEnc`
- `lastVerified` (nullable)
- `isActive` (bool, default `true`)
- `createdAt`
- `updatedAt`
- `deletedAt` (nullable, soft delete)

Indexes:
- `(tenantId, userId)`
- `(supplierId)`

Notes:
- Active-record uniqueness is enforced by a **partial unique index in migration SQL** (`deletedAt IS NULL`).

---

### `supplier_contract_prices` (`SupplierContractPrice`)
- `id` (PK, uuid)
- `supplierProductId` (FK -> `supplier_products.id`)
- `tenantId`
- `price` (int, millicents)
- `effectiveFrom` (default `now()`)
- `effectiveTo` (nullable; `NULL` means currently active)
- `contractRef` (nullable)
- `notes` (nullable)
- `createdAt`
- `updatedAt`

Indexes:
- `(supplierProductId, tenantId)`
- `(tenantId)`

---

### `supplier_price_records` (`SupplierPriceRecord`)
- `id` (PK, uuid)
- `supplierProductId` (FK -> `supplier_products.id`)
- `tenantId`
- `observedPrice` (int, millicents)
- `source` (`SupplierPriceSource`, default `MANUAL_ENTRY`)
- `credentialId` (nullable, FK -> `supplier_credentials.id`)
- `observedAt` (default `now()`)
- `notes` (nullable)

Indexes:
- `(supplierProductId, tenantId)`
- `(tenantId)`

---

## Relationship Overview (ER-style)

- `Supplier` 1 ── N `SupplierProduct`
- `Supplier` 1 ── N `SupplierCredential`
- `Supplier` 1 ── N `SupplierRequest` (via `resolvedSupplierId`)
- `SupplierProduct` 1 ── N `IngredientSupplierLink`
- `SupplierProduct` 1 ── N `SupplierContractPrice`
- `SupplierProduct` 1 ── N `SupplierPriceRecord`
- `SupplierCredential` 1 ── N `SupplierPriceRecord`
- `Ingredient` 1 ── N `IngredientSupplierLink`
- `User` 1 ── N `SupplierRequest` (requestedBy/reviewedBy)

## Source of truth

- Main schema: `prisma/schema.prisma`
- Supplier-specific migration nuances:
  - `prisma/migrations/20260423101000_supplier_credential_partial_unique/migration.sql`
  - `prisma/migrations/20260426110000_supplier_product_url_normalization/migration.sql`
