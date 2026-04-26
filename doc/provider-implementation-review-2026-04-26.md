# Provider implementation review (Loyverse / Lightspeed / Uber Eats / DoorDash)

Date: 2026-04-26

## Scope
- Reviewed provider integration and catalog adapter code paths for:
  - LOYVERSE
  - LIGHTSPEED
  - UBER_EATS
  - DOORDASH

## Findings

### 1) LOYVERSE
- **Catalog import adapter is implemented** and fetches categories/modifier groups/items from Loyverse API, then maps to `FullCatalogPayload`.
- **Catalog publish adapter is implemented** with API calls for category and item create/update/delete paths.
- No explicit stub/TODO markers were found for LOYVERSE in the reviewed provider-specific catalog adapters.

### 2) LIGHTSPEED
- **Provider adapter implementation exists** (OAuth callback/token refresh/store listing/menu fetch helpers).
- However, LIGHTSPEED is **not wired into integration lifecycle registration imports** in `services/integration.service.ts` (only Loyverse/UberEats/DoorDash adapters are auto-imported).
- LIGHTSPEED is also **excluded from connect/disconnect/callback route provider allowlists and slug map**, which means user-facing OAuth flow endpoints do not currently support it.
- Conclusion: core adapter code exists, but end-to-end connect/callback/disconnect path is not fully enabled.

### 3) UBER_EATS
- **Catalog import adapter remains a Phase 2 stub**:
  - `fetchFullCatalog()` returns empty arrays and has TODO notes for real Menu API mapping.
- **Catalog publish adapter remains a stub**:
  - All publish operations return `NOT_IMPLEMENTED` responses.
- Conclusion: import + publish for catalog are still unimplemented beyond placeholder behavior.

### 4) DOORDASH
- **Catalog import adapter remains a Phase 2 stub**:
  - `fetchFullCatalog()` returns empty arrays and has TODO notes for Merchant API mapping.
- **Catalog publish adapter remains a stub**:
  - All publish operations return `NOT_IMPLEMENTED` responses.
- **DoorDash payload builders are also stubbed**:
  - builder functions throw not-yet-implemented errors.
- Conclusion: import + publish path (including payload build layer) is still unimplemented for catalog sync/publish.

## Practical summary (what is still unimplemented)
- **LOYVERSE**: No major provider-specific catalog import/publish stub found in reviewed files.
- **LIGHTSPEED**: Integration lifecycle wiring (registration import + API route allowlists/slug mapping) is incomplete.
- **UBER_EATS**: Catalog import and publish are stubs.
- **DOORDASH**: Catalog import, publish adapter, and payload builders are stubs.
