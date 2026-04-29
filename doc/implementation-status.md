# Beyond — Implementation Status Audit (2026-04-28)

This document is an operational reference based on the current codebase, summarizing **features that are actually implemented** and those that are **partially implemented or not yet implemented**.

---

## 1) Core Implementation Summary

### 1.1 Platform / Auth / Portals
- Next.js App Router multi-portal structure (Customer / Backoffice / Owner / Admin)
- JWT session + role/permission-based access control
- Prisma-based multi-tenant domain model

### 1.2 Catalog Domain
- Catalog architecture Phase 1–8 (internal canonical → import → mapping → publish → external change detection → conflict → sync policy → merge editor)
- Related UI / API / service / database tables are all wired together

### 1.3 Business Portal Features
- Customer Portal Phase 1–5 (orders, subscriptions, account, addresses, notifications, loyalty, payment methods, reviews, support, referrals, push preferences)
- Owner Console (reports, customers, subscriptions, team, activity, promotions, gift cards, webhooks, settings, integrations, etc.)
- Admin Console (dashboard, logs, jobs, billing, system monitoring, feature flags, compliance)

---

## 2) Provider Integration Status

| Feature | Loyverse | Lightspeed | Uber Eats | DoorDash |
|---------|:--------:|:----------:|:---------:|:--------:|
| OAuth Connect | ✅ | ✅ | ✅ | ✅ |
| Token Refresh | ✅ | ✅ | ✅ | ✅ |
| Store Listing | — | ✅ | ✅ | ✅ |
| Catalog Import | ✅ | ✅ | ✅ | ✅ |
| Catalog Publish | ✅ | ✅ | ✅ | ✅ |
| Modifier Group/Option Publish | ✅ | ✅ | ✅ | ✅ |
| Availability Publish | — | ✅ | ✅ | ✅ |
| Order Webhooks | ✅ | — | ✅ | ✅ |
| Full Live API Verified | ✅ | ⚠️ | ⚠️ | ⚠️ |

> ⚠️ Adapter logic is fully implemented and structurally correct (OAuth lifecycle, token exchange,
> token refresh, store listing, catalog import, catalog publish including modifier groups and options,
> and availability publish). Full live end-to-end verification against provider production APIs
> requires provider credentials not available in this environment.
>
> **What is implemented:** All import/publish adapter methods, payload builders, API endpoint calls,
> credential passing, error handling, and mapping lookups.
>
> **What is not yet live-verified:** Actual provider API response shapes may differ from expected;
> response mapping should be treated as best-effort until tested with real credentials.

### Key adapter files

- `adapters/integrations/lightspeed.adapter.ts` — OAuth connect/callback/refresh/store-list
- `adapters/catalog/lightspeed.adapter.ts` — catalog import (menu items, modifier groups)
- `adapters/catalog/lightspeed-publish.adapter.ts` — catalog publish (categories, products, modifier groups, modifier options)
- `adapters/integrations/uber-eats.adapter.ts` — OAuth connect/callback/refresh/store-list
- `adapters/catalog/uber-eats.adapter.ts` — catalog import (menus, categories, items, modifier groups, options)
- `adapters/catalog/uber-eats-publish.adapter.ts` — catalog publish (full menu read/mutate/write cycle)
- `services/catalog-publish/payload-builders/uber-eats/index.ts` — Uber Eats payload builders
- `adapters/integrations/doordash.adapter.ts` — OAuth connect/callback/refresh/store-list
- `adapters/catalog/doordash.adapter.ts` — catalog import (menus, categories, items, modifier groups, options)
- `adapters/catalog/doordash-publish.adapter.ts` — catalog publish (full menu read/mutate/write cycle)
- `services/catalog-publish/payload-builders/doordash/index.ts` — DoorDash payload builders

---

## 3) Partially Implemented / Not Yet Implemented

### 3.1 Store Service Incomplete
- `services/store.service.ts`
  - `getStoresByTenant()` returns an empty array
  - `getStore()` returns null
  - `createStore()` throws a not-implemented exception

### 3.2 Supplier Scraper — Some Adapters Are Skeletons
- `lib/supplier-scraper/adapters/bifold.ts`
- `lib/supplier-scraper/adapters/countdown.ts`
- `lib/supplier-scraper/adapters/foodstuffs.ts`

These adapters have login and product collection logic in stub state based on comments and logs.

### 3.3 Lightspeed — Order Webhook Ingestion
- Lightspeed order webhook ingestion is not yet implemented (capability flag: `orderWebhookIngestion: false`).

---

## 4) Recommended Priority Backlog

1. **P1 — Connect Store Service Actual CRUD**
   - Remove placeholders in `services/store.service.ts`

2. **P1 — Implement Supplier Scraper Adapters**
   - Implement login flow and product parsing for Bifold, Countdown, and Foodstuffs

3. **P2 — Provider Live API Verification**
   - End-to-end verification for Lightspeed / Uber Eats / DoorDash with real provider credentials

4. **P2 — Lightspeed Order Webhook Ingestion**
   - Implement order webhook handling (currently not supported)

---

## 5) Operational Principles

Recommended role separation for documentation:
- `features.md` — user-facing capability reference
- `doc/roadmap.md` — progress tracking and next tasks
- `doc/implementation-status.md` (this document) — code-based source of truth for implementation state
