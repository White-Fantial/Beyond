# Admin Console

The `/admin` portal is a **PLATFORM_ADMIN-only operations console** for managing the entire platform.

## Access Control

Protected at three levels:
1. `middleware.ts` — edge-level route guard, blocks non-`PLATFORM_ADMIN` before any page loads
2. `app/admin/layout.tsx` — server component auth check via `requireAuth()`
3. Service layer — `requirePlatformAdmin()` helper in each page

`OWNER`, `MANAGER`, `STAFF`, and other roles **cannot** access `/admin`. Unauthorized users are redirected to `/unauthorized`.

## Routes

| Route | Description |
|-------|-------------|
| `/admin` | Platform dashboard — KPI cards + recent tenants/users/stores |
| `/admin/system` | System Monitoring / Health Dashboard |
| `/admin/tenants` | Tenant list with search, status filter, pagination |
| `/admin/tenants/[tenantId]` | Tenant detail — info, stores, memberships, connection summary, status change |
| `/admin/users` | User list with search, status filter, pagination |
| `/admin/users/[userId]` | User detail — info, tenant memberships, store memberships, status change |
| `/admin/stores` | Store list with search, status filter, pagination |
| `/admin/stores/[storeId]` | Store detail — info, memberships, connections, status change |
| `/admin/integrations` | Platform-wide connection list — filter by status/provider, pagination |
| `/admin/integrations/[connectionId]` | Connection detail — status change, credential rotation, action log |
| `/admin/jobs` | Jobs Console — view, manually trigger, and safely retry operational recovery jobs |
| `/admin/jobs/[jobRunId]` | Job Run detail — input/result/error with sensitive-field masking, retry lineage |
| `/admin/logs` | Unified Logs Console — audit, connection, webhook, and order event logs |
| `/admin/logs/[logType]/[logId]` | Log detail — source-specific metadata, sanitized payload, context links |
| `/admin/billing` | Billing Overview — MRR estimate, plan distribution, recent subscription events |
| `/admin/billing/plans` | Plan list with status filter; create new plan |
| `/admin/billing/plans/[planId]` | Plan detail — edit info, manage limits & features, view subscribed tenants |
| `/admin/billing/tenants` | Tenant billing list — subscription status, usage, over-limit indicator |
| `/admin/billing/tenants/[tenantId]` | Tenant billing detail — subscription management, usage vs limits, billing records |
| `/admin/feature-flags` | Feature Flags Console — list, create, filter by status/search |
| `/admin/feature-flags/[flagKey]` | Feature flag detail — assignments, status change, audit history |

## Dashboard KPIs

- Total tenants, stores, users, connections
- New tenants / users / stores in last 7 days
- Recent 5 items each for tenants, users, stores

## Write Actions (Phase 2)

Status changes are performed from entity detail pages. Each detail page shows a **Status Change** section with a dropdown and save button:

- **Tenant**: ACTIVE / TRIAL / SUSPENDED / ARCHIVED
- **User**: ACTIVE / INVITED / SUSPENDED / ARCHIVED
- **Store**: ACTIVE / INACTIVE / ARCHIVED

Changes call `PATCH /api/admin/{entity}/{id}/status` and refresh the page on success.

---

## User Impersonation

`PLATFORM_ADMIN` can view the app from any user's point of view for support and issue reproduction.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **actor** | The real logged-in admin — always `PLATFORM_ADMIN`. Recorded in all audit logs. |
| **effective user** | The impersonated target — governs UI, permissions, and portal routing during the session. |

### How It Works

1. On `/admin/users/[userId]`, admins see a **"View as user"** button (hidden for other admins and inactive users).
2. Clicking the button shows a confirmation dialog explaining the impersonation scope.
3. On confirm, `POST /api/admin/impersonate` is called — creates a signed `beyond_impersonation` JWT cookie, resolves the effective user's landing page, and redirects there.
4. While impersonating, a **full-width sticky amber banner** is shown across all portals.
5. The banner shows: effective user name/email, signed-in admin email, start time, and an **"Exit impersonation"** button.
6. Exiting via `DELETE /api/admin/impersonate` clears the cookie, logs `impersonation.ended`, and redirects back to `/admin/users/[userId]`.

### Policy

| Rule | Detail |
|------|--------|
| Who can impersonate | `PLATFORM_ADMIN` only |
| Allowed targets | Any active user who is not a `PLATFORM_ADMIN` |
| Blocked targets | Other `PLATFORM_ADMIN` users, `SUSPENDED` / `ARCHIVED` / `INVITED` accounts |
| Concurrent impersonations | One per session — starting a new one replaces the previous |
| Audit logging | `impersonation.started`, `impersonation.ended`, `impersonation.denied` events |

### Session Architecture

| Cookie | Purpose |
|--------|---------|
| `beyond_session` | Actor's original JWT — **unchanged** throughout impersonation |
| `beyond_impersonation` | Signed JWT overlay with effective user's identity and routing hints |

### Technical Files

| File | Role |
|------|------|
| `lib/auth/impersonation.ts` | `ImpersonationPayload` type, JWT helpers |
| `app/api/admin/impersonate/route.ts` | `POST` (start) and `DELETE` (end) API endpoints |
| `components/admin/ImpersonationBanner.tsx` | Server component — reads cookie server-side, renders client banner |
| `components/admin/ImpersonationBannerClient.tsx` | Client component — sticky banner UI with exit button |
| `components/admin/ImpersonateButton.tsx` | Client component — "View as user" button + confirmation dialog |
| `app/layout.tsx` | Root layout — mounts `ImpersonationBanner` globally |

---

## Logs Console (Phase 4)

The `/admin/logs` page is a **unified, read-only log console** for platform operators.

### Log Sources

| Source | Description |
|--------|-------------|
| `AuditLog` | Admin write actions, impersonation events, critical system changes |
| `ConnectionActionLog` | Integration connect / callback / refresh / disconnect / re-auth |
| `InboundWebhookLog` | Inbound webhook reception and processing results |
| `OrderEvent` | Order lifecycle events — status changes, POS forwarding, reconciliation |

### Filters

| Param | Description |
|-------|-------------|
| `q` | Free-text search (action, message, event name, order ID) |
| `logType` | `AUDIT` / `CONNECTION_ACTION` / `WEBHOOK` / `ORDER_EVENT` |
| `from` / `to` | Date range (ISO 8601 or `YYYY-MM-DD`) |
| `tenantId` | Filter by tenant |
| `storeId` | Filter by store |
| `userId` | Filter by actor user |
| `provider` | Filter by provider (`LOYVERSE`, `UBER_EATS`, `DOORDASH`, `STRIPE`) |
| `actionType` | Filter by action/event type |
| `status` | Filter by status |
| `errorOnly` | `1` — show only ERROR-severity logs |
| `page` | Pagination (default 1, page size 20) |

### Sensitive Data Masking

All raw payloads and metadata are processed by `lib/admin/logs/sanitize.ts` before display. The following field keys are **always** replaced with `[REDACTED]`:

`password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `secret`, `clientSecret`, `signingKey`, `signature`, `authorization`, `cookie`, `session`, `configEncrypted`, `rawCredential`, `webhookSecret`, `apiKey`, `credential`, `privateKey`

### Technical Files

| File | Role |
|------|------|
| `types/admin-logs.ts` | Normalized type definitions |
| `lib/admin/logs/sanitize.ts` | Sensitive-field masking (recursive, tested) |
| `lib/admin/logs/normalize.ts` | Per-source normalizers |
| `lib/admin/logs/labels.ts` | Human-readable labels |
| `lib/admin/logs/filters.ts` | Filter query-param parsing |
| `services/admin/admin-log.service.ts` | Unified log query service |
| `components/admin/logs/` | UI components |
| `__tests__/sanitize.test.ts` | Unit tests |

---

## Jobs Console (Phase 5)

The `/admin/jobs` page is a **PLATFORM_ADMIN-only operational console** for managing platform recovery jobs.

### Job Types

| Job Type | Description | Risk Level |
|----------|-------------|------------|
| `CATALOG_SYNC` | Loyverse full catalog sync for a store | LOW |
| `CONNECTION_VALIDATE` | Read-only credential/status check | LOW |
| `CONNECTION_REFRESH_CHECK` | Safe token refresh | MEDIUM |
| `ORDER_RECOVERY_RETRY` | Re-send a failed POS order (idempotency preserved) | MEDIUM |
| `ORDER_RECONCILIATION_RETRY` | Batch retry of PENDING/FAILED POS orders | MEDIUM |
| `ANALYTICS_REBUILD` | Rebuild store-scoped order aggregation snapshot | LOW |

HIGH-risk job types (billing charge retry, destructive cleanup, credential overwrite, webhook mass replay) are **not implemented** in Phase 5.

### Status Lifecycle

```
QUEUED → RUNNING → SUCCEEDED
                 → FAILED
       → SKIPPED (when no action needed)
       → CANCELLED
```

Retry creates a new `JobRun` with `triggerSource = ADMIN_RETRY` and `parentRunId = originalRun.id`. The original FAILED run is **never modified**.

### Security

- All routes and API endpoints require `PLATFORM_ADMIN`
- Manual run and retry are **blocked during impersonation** — admin must exit impersonation first
- All `inputJson` / `resultJson` / `errorMessage` fields are passed through `sanitizeJsonValue` before display

### Technical Files

| File | Role |
|------|------|
| `prisma/schema.prisma` | `JobRun` model + enums |
| `types/admin-jobs.ts` | View model types |
| `lib/admin/jobs/filters.ts` | Filter query-param parsing |
| `lib/admin/jobs/labels.ts` | Human-readable labels |
| `lib/admin/jobs/guards.ts` | `canRetryJobRun`, `canManuallyRunJobType` |
| `lib/admin/jobs/normalize.ts` | Prisma row → view model (with sanitization) |
| `services/admin/admin-job.service.ts` | Orchestration service — list, detail, manual run, retry |
| `app/api/admin/jobs/run/route.ts` | `POST` manual run endpoint |
| `app/api/admin/jobs/[jobRunId]/retry/route.ts` | `POST` retry endpoint |
| `components/admin/jobs/` | UI components |

---

## Billing Panel (Phase 6)

Plan CRUD (limits & features), tenant subscription management (plan change, trial extend, status change), billing account editor, billing records & subscription event history, MRR estimate dashboard.

### Routes

| Route | Description |
|-------|-------------|
| `/admin/billing` | Overview — MRR estimate, plan distribution, recent events |
| `/admin/billing/plans` | Plan list; create new plan |
| `/admin/billing/plans/[planId]` | Plan detail — edit info, manage limits & features |
| `/admin/billing/tenants` | Tenant billing list — status, usage, over-limit indicator |
| `/admin/billing/tenants/[tenantId]` | Tenant billing detail — subscription management, billing records |

### Technical Files

| File | Role |
|------|------|
| `services/admin/admin-plan.service.ts` | Plan CRUD |
| `services/admin/admin-subscription.service.ts` | Tenant subscription management |
| `services/admin/admin-billing.service.ts` | Billing overview aggregation |
| `components/admin/billing/` | 14 UI components |

---

## Integrations Admin Panel (Phase 7)

### Actions

| Action | HTTP | Description |
|--------|------|-------------|
| Status change | `PATCH /api/admin/integrations/[connectionId]/status` | Force a connection to `CONNECTED`, `DISCONNECTED`, `ERROR`, etc. |
| Credential rotation | `POST /api/admin/integrations/[connectionId]/rotate-credential` | Deactivate current credential and generate a placeholder for re-auth |

Both actions are blocked during active impersonation and emit audit events.

### Technical Files

| File | Role |
|------|------|
| `services/admin/admin-integration.service.ts` | `getAdminConnectionDetail`, `updateAdminConnectionStatus`, `adminRotateCredential` |
| `app/api/admin/integrations/[connectionId]/status/route.ts` | `PATCH` status change endpoint |
| `app/api/admin/integrations/[connectionId]/rotate-credential/route.ts` | `POST` credential rotation endpoint |
| `components/admin/ConnectionCredentialTable.tsx` | Credential lifecycle table |
| `components/admin/ConnectionStatusChangeForm.tsx` | Inline status select + submit |
| `components/admin/RotateCredentialButton.tsx` | Credential rotation trigger button |

---

## System Monitoring (Phase 8)

The `/admin/system` dashboard provides platform health, operational metrics, incidents, and drill-down links.

### Technical Files

| File | Role |
|------|------|
| `app/admin/system/page.tsx` | System monitoring dashboard page |
| `services/admin/admin-system.service.ts` | System overview aggregation |
| `services/admin/admin-health.service.ts` | Health check aggregation |
| `services/admin/admin-metrics.service.ts` | Operational metrics |
| `services/admin/admin-incident.service.ts` | Incident tracking |
| `lib/admin/system/` | `thresholds`, `health`, `metrics`, `incidents`, `labels` helpers |
| `types/admin-system.ts` | Type definitions |
| `components/admin/system/` | 9 UI components |

---

## Feature Flags Console (Phase 9)

Provides runtime feature control, percentage rollout, and per-scope overrides without deployments.

### Concepts

| Concept | Description |
|---------|-------------|
| **FeatureFlag** | A named toggle with a stable `key`, a `flagType` (BOOLEAN / STRING / INTEGER / JSON / VARIANT), global default values, and a lifecycle `status` (ACTIVE / INACTIVE / ARCHIVED) |
| **FeatureFlagAssignment** | A scoped override: a specific value applied when the evaluation context matches `scopeType` + `scopeKey` |
| **Evaluation** | `evaluateFlag(flagKey, context)` walks assignments ordered by priority. First match wins; falls back to flag default, then hard-coded default. |
| **Percentage rollout** | Assignments with `scopeType=PERCENTAGE` use a deterministic hash of `flagKey + userId/tenantId` to assign users to a bucket (0–100%) |

### Scope Types

| Scope | Description |
|-------|-------------|
| `GLOBAL` | Applies to everyone |
| `TENANT` | Matches a specific `tenantId` |
| `STORE` | Matches a specific `storeId` |
| `USER` | Matches a specific `userId` |
| `ROLE` | Matches a platform or store role string |
| `PORTAL` | Matches the portal name (`admin`, `backoffice`, `owner`, `customer`) |
| `PROVIDER` | Matches a connection provider |
| `ENVIRONMENT` | Matches an environment string (`production`, `staging`) |
| `PERCENTAGE` | Assigns a bucket percentage (0–100) using deterministic hashing |

### API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/feature-flags` | List flags |
| `POST` | `/api/admin/feature-flags` | Create flag |
| `GET` | `/api/admin/feature-flags/[flagKey]` | Get flag detail |
| `PATCH` | `/api/admin/feature-flags/[flagKey]` | Update flag fields or change status |
| `POST` | `/api/admin/feature-flags/[flagKey]/assignments` | Add assignment |
| `PATCH` | `/api/admin/feature-flags/[flagKey]/assignments/[assignmentId]` | Toggle assignment active/inactive |
| `DELETE` | `/api/admin/feature-flags/[flagKey]/assignments/[assignmentId]` | Delete assignment |

### Technical Files

| File | Role |
|------|------|
| `prisma/schema.prisma` | `FeatureFlag` + `FeatureFlagAssignment` models and enums |
| `prisma/seeds/feature-flags.ts` | Default flag seed (7 platform flags) |
| `types/feature-flags.ts` | View model types, input types, evaluation types |
| `lib/flags/evaluate.ts` | `evaluateFlag(flagKey, context)` |
| `lib/flags/defaults.ts` | `KNOWN_FLAGS` constants + hard-coded fallback defaults |
| `lib/flags/guards.ts` | Typed convenience helpers |
| `lib/flags/context.ts` | `buildFlagContextFromSession()` |
| `lib/flags/hashing.ts` | `hashToPercentage(key, seed)` — deterministic 0–100 bucket assignment |
| `services/admin/admin-feature-flag.service.ts` | CRUD + assignment management service |
| `app/api/admin/feature-flags/` | REST API routes |
| `components/admin/feature-flags/` | 8 UI components |

---

## Implementation Notes

- **Service layer**: `services/admin/` is separate from owner/backoffice services
- **Write API routes**: `app/api/admin/tenants/[id]/status`, `app/api/admin/users/[id]/status`, `app/api/admin/stores/[id]/status`
- **No sensitive data**: passwordHash, tokens, session data are never exposed
- **Mobile support**: sidebar hidden on mobile with a compact navigation bar
- **Pagination**: 20 items per page, query-string based (`?q=...&status=...&page=...`)
