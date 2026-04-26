# Admin Supplier CSV Product Registration — Feature Design

## 1. Goal
Enable platform admins to bulk-register products for each supplier by uploading a CSV file in the Admin Console.

This feature should:
- Minimize manual product entry effort.
- Keep supplier data scoped and isolated.
- Validate input strongly before writing data.
- Provide actionable error feedback for correction and re-upload.

## 2. Scope
### In Scope
- Admin uploads CSV for a selected supplier.
- Schema/template download for CSV format.
- Pre-validation (file-level + row-level).
- Dry-run preview with success/failure counts.
- Execute import and create/update product records.
- Import job history and downloadable error report.

### Out of Scope (Phase 1)
- Image file ingestion from local zip uploads.
- Variant matrix generation (size/options permutations).
- Partial rollback after a committed import.
- Supplier self-service uploads (admin only for now).

## 3. Primary User Flow
1. Admin enters `Admin > Suppliers > [Supplier Detail] > Product Imports`.
2. Admin downloads the latest CSV template.
3. Admin uploads filled CSV and clicks **Validate**.
4. System performs dry-run validation and displays:
   - Total rows
   - Valid rows
   - Invalid rows
   - Warning rows (e.g., duplicate SKUs in file)
5. Admin downloads error CSV if invalid rows exist.
6. Admin clicks **Import** to run final import.
7. System creates an import job record and processes asynchronously.
8. Admin monitors status (`queued`, `processing`, `completed`, `failed`, `partial_success`).
9. Admin opens job detail to see summary and row-level issues.

## 4. CSV Contract
## 4.1 Required Columns
- `supplierExternalId` (string; must match selected supplier or be omitted if route-scoped)
- `sku` (string; unique per supplier)
- `name` (string; 1-120 chars)
- `category` (string; mapped to internal taxonomy)
- `price` (decimal string in USD, e.g. `12.99`)
- `status` (`ACTIVE` | `INACTIVE`)

## 4.2 Optional Columns
- `description` (string; up to 2000 chars)
- `barcode` (string)
- `unit` (string; e.g. `EA`, `KG`)
- `minOrderQty` (integer)
- `taxCode` (string)
- `effectiveFrom` (ISO date, `YYYY-MM-DD`)
- `effectiveTo` (ISO date, `YYYY-MM-DD`)

## 4.3 Parsing Rules
- UTF-8 with or without BOM.
- Comma delimiter only.
- Quoted values allowed.
- Ignore trailing empty lines.
- Header names are case-insensitive but normalized to canonical keys.

## 5. Validation Strategy
## 5.1 File-Level Validation
- File extension must be `.csv`.
- Max file size: 10 MB.
- Max rows: 20,000 (excluding header).
- Header must include all required columns.

## 5.2 Row-Level Validation
- Required values non-empty.
- Price must be parseable positive decimal with up to 2 digits fraction.
- Convert price to millicents (`value * 100000`) before persistence.
- `effectiveFrom <= effectiveTo` when both provided.
- `sku` uniqueness inside the uploaded file.
- `sku` uniqueness constraint with DB for target supplier.

## 5.3 Referential Validation
- Supplier exists and is active.
- Category exists or can be mapped via configured alias table.
- Tax code exists when provided.

## 5.4 Error Reporting
Return structured errors:
- `rowNumber`
- `column`
- `code` (e.g., `REQUIRED_MISSING`, `INVALID_PRICE`, `DUPLICATE_SKU`)
- `message`

Provide downloadable `errors.csv` with original row + error columns.

## 6. Import Semantics
Two modes (admin toggle):
- **Upsert mode (default)**: create if SKU not exists, update if exists.
- **Create-only mode**: fail rows where SKU already exists.

Recommended conflict behavior in upsert:
- Immutable fields: `supplierId`, `sku`
- Mutable fields: `name`, `description`, `price`, `status`, metadata

Idempotency:
- Compute `fileChecksum` (SHA-256).
- If same supplier + checksum imported within last 24h, warn admin before re-run.

## 7. Data Model Proposal
Add tables:

### `supplier_product_import_jobs`
- `id` (uuid, pk)
- `supplierId` (fk)
- `uploadedByAdminId` (fk)
- `fileName` (text)
- `fileChecksum` (text)
- `mode` (`UPSERT` | `CREATE_ONLY`)
- `status` (`QUEUED` | `PROCESSING` | `COMPLETED` | `FAILED` | `PARTIAL_SUCCESS`)
- `totalRows` (int)
- `validRows` (int)
- `invalidRows` (int)
- `createdCount` (int)
- `updatedCount` (int)
- `failedCount` (int)
- `errorReportPath` (text, nullable)
- `startedAt`, `completedAt` (timestamp, nullable)
- `createdAt`, `updatedAt`

### `supplier_product_import_job_rows`
- `id` (uuid, pk)
- `jobId` (fk)
- `rowNumber` (int)
- `sku` (text)
- `action` (`CREATE` | `UPDATE` | `SKIP`)
- `status` (`VALID` | `INVALID` | `IMPORTED` | `FAILED`)
- `errorCode` (text, nullable)
- `errorMessage` (text, nullable)
- `rawPayload` (jsonb)
- `createdAt`

Indexes:
- `jobs(supplierId, createdAt desc)`
- `job_rows(jobId, rowNumber)`
- Existing unique product index: `(supplierId, sku)`

## 8. API Design
## 8.1 Endpoints (Admin only)
- `POST /api/admin/suppliers/:supplierId/product-imports/validate`
  - multipart upload
  - returns validation summary + temporary token

- `POST /api/admin/suppliers/:supplierId/product-imports/execute`
  - body: `{ validationToken, mode }`
  - creates job and enqueues worker

- `GET /api/admin/suppliers/:supplierId/product-imports`
  - list jobs with pagination

- `GET /api/admin/suppliers/:supplierId/product-imports/:jobId`
  - job detail + row errors

- `GET /api/admin/suppliers/:supplierId/product-imports/:jobId/errors.csv`
  - downloads error report

## 8.2 AuthN/AuthZ
- Require admin session.
- RBAC permission: `supplier.products.import`.
- Ensure supplier belongs to tenant context where applicable.

## 9. Processing Architecture
- Validation request performs synchronous parse + lightweight checks.
- Execution enqueues background job (queue worker / cron worker).
- Worker processes in chunks (e.g., 500 rows per transaction batch).
- Use bounded retry (max 3) for transient DB errors.
- Job status transitions are atomic and auditable.

Recommended stack alignment:
- Parsing: `csv-parse` or equivalent.
- Queue: existing project job mechanism (or add BullMQ if absent).

## 10. UI/UX Design (Admin)
### Main Components
- `SupplierImportPanel`
- `CsvDropzone`
- `ValidationSummaryCard`
- `ImportJobTable`
- `ImportJobDetailDrawer` (or dedicated page)

### UX Details
- Disable **Import** until validation passes.
- Show first 100 row errors inline; rest via download.
- Provide sample CSV and field definition helper.
- Confirm modal before execute: “N products will be created/updated”.

## 11. Observability & Audit
- Audit log events:
  - `SUPPLIER_PRODUCT_IMPORT_VALIDATED`
  - `SUPPLIER_PRODUCT_IMPORT_STARTED`
  - `SUPPLIER_PRODUCT_IMPORT_COMPLETED`
  - `SUPPLIER_PRODUCT_IMPORT_FAILED`
- Metrics:
  - jobs/day
  - avg processing time
  - invalid row ratio
  - failure rate by supplier
- Structured logs include `jobId`, `supplierId`, `adminId`.

## 12. Security Considerations
- Validate MIME + extension + safe CSV parser settings.
- Prevent CSV formula injection in exported error files:
  - Escape values starting with `=`, `+`, `-`, `@`.
- Enforce upload size limits server-side.
- Retain uploaded source file for limited period (e.g., 30 days) then purge.

## 13. Rollout Plan
### Phase 1
- Validate + execute + job history for create/update basic fields.

### Phase 2
- Advanced category mapping UI + scheduled recurring imports.

### Phase 3
- Supplier self-service portal + webhooks after import completion.

## 14. Acceptance Criteria
- Admin can upload CSV and receive validation result in under 10 seconds for 5,000 rows.
- Import job reliably processes 20,000 rows without timeout.
- Row-level failures do not block valid rows from importing.
- Admin can download error CSV and retry with corrected file.
- All actions are auditable by job ID and admin ID.

## 15. Open Questions
- Should imports allow soft-deleted SKU reactivation?
- Should category mapping create unknown categories automatically or fail hard?
- Is price overwrite always allowed, or role-gated by finance permission?
- Do we need per-supplier custom CSV schemas?
