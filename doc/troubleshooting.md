# Troubleshooting

## No active Loyverse connection found (sync returns 404)

The sync endpoint looks up a `Connection` with `type=POS`, `provider=LOYVERSE`, and `status=CONNECTED` for the given `storeId`. If this query returns nothing, check:

1. A `Connection` row exists for the store with the correct type/provider.
2. `connection.status` is `CONNECTED` (not `PENDING`, `DISCONNECTED`, or `ERROR`).
3. You are using the correct `storeId` UUID (not the store `code`).

## No active credential for connection (sync returns 404)

After resolving the connection, the endpoint looks for a `ConnectionCredential` row where `isActive = true`. If missing:

1. Ensure a credential was inserted via `createConnectionCredential()` (or the seed).
2. Check that `isActive` was not accidentally set to `false` during a credential rotation.
3. `configEncrypted` must contain the Loyverse access token.

## Modifier groups not appearing in order UI

The order UI reads modifier groups from `catalog_product_modifier_groups`, which is populated during full catalog sync from Loyverse `item.modifier_ids`. If modifiers are missing, trace the chain:

1. **Loyverse API**: confirm the item returns `modifier_ids` (non-empty array).
2. **External mirror**: check `external_catalog_product_modifier_group_links` for a row with `(connectionId, externalProductId, externalModifierGroupId)`.
3. **Internal link**: check `catalog_product_modifier_groups` for a row with the internal product/modifier-group IDs and `isActive = true`.
4. **API response**: `GET /api/catalog/modifier-groups?storeId=<id>` should return the groups.

Run a full sync (`POST /api/catalog/sync`) after confirming the Loyverse data is correct.

## Outbound order fails: mapping missing for entity

`resolveExternalId()` in `catalog.service.ts` returns `null` when no `ChannelEntityMapping` row exists for the requested `(connectionId, entityType, internalEntityId)`. This means:

1. The catalog sync was never run, or the entity appeared after the last sync — run a full sync.
2. The entity was deactivated/deleted in Loyverse but the internal row was not cleaned up — deactivate the internal row and re-sync.
3. The mapping was manually deleted — re-run sync to recreate it.

Never fall back to using internal UUIDs as Loyverse IDs. If the mapping is missing, the order must be blocked until sync is re-run and the mapping is restored.
