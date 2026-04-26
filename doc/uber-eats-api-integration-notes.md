# Uber Eats API Integration Notes (Catalog, Orders, Availability)

Updated: 2026-04-26.

## Official Uber Eats API references reviewed

- API overview: https://developer.uber.com/docs/eats
- List stores: `GET /v1/eats/stores`
- Get menu: `GET /v2/eats/stores/{store_id}/menus`
- Update menu: `PUT /v2/eats/stores/{store_id}/menus`
- Order notifications webhook: `orders.notification`
- Store integration guide (status + holiday hours): https://developer.uber.com/docs/eats/guides/store-integration
- Get store status: `GET /v1/eats/store/{store_id}/status`

## Beyond implementation mapping

### 1) Tenant owner connects Uber Eats

- OAuth flow is used for merchant authorization.
- When connection is saved, provider capabilities are now persisted into `Connection.capabilitiesJson`.
- Uber Eats capability profile now explicitly marks:
  - `catalogSync=true`
  - `catalogPublish=true`
  - `orderWebhookIngestion=true`
  - `availabilitySync=true`
  - `supportsStoreDiscovery=true`

### 2) Catalog payload shaping

- Uber catalog payload builders now generate menu-v2 compatible fragments for:
  - categories
  - items (products)
- Availability is normalized through a shared helper and mapped to provider payload fields:
  - category `active`
  - item `suspended`
  - service availability windows (`service_availability`)

### 3) Order webhook ingestion

- Uber order webhook handler now supports both:
  - direct order payloads with `order_id`
  - webhook envelope payloads with `resource_id` / `resource_href` (orders.notification style)
- Currency fallback defaults were aligned to `USD`.

## Notes / current limitations

- Menu writes in Uber Eats are menu-level operations. Entity-level create/update calls must still be merged into a full menu document by the publish adapter orchestration path.
- Full adapter-level `PUT /menus` execution is tracked separately from payload-fragment generation.
