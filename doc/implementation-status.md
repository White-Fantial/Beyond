# Beyond — Implementation Status Audit (2026-04-28)

본 문서는 현재 코드베이스 기준으로 **실제로 구현된 기능**과 **아직 미구현/부분구현 상태**를 정리한 운영 문서입니다.

---

## 1) 핵심 구현 현황 (요약)

### 1.1 플랫폼/권한/포털
- Next.js App Router 기반 멀티 포털(고객/백오피스/오너/어드민) 구조 적용
- JWT 세션 + 역할/권한 기반 접근 제어
- Prisma 기반 멀티테넌트 도메인 모델

### 1.2 카탈로그 도메인
- Phase 1~8(내부 정본 → import → mapping → publish → external change detection → conflict → sync policy → merge editor)까지 주요 흐름 존재
- 관련 UI/API/서비스/테이블이 전반적으로 연결되어 있음

### 1.3 비즈니스 포털 기능
- Customer Portal Phase 1~5 (주문, 구독, 계정, 주소, 알림, 로열티, 결제수단, 리뷰, 지원, 추천, 푸시 설정)
- Owner Console(리포트/고객/구독/팀/활동/프로모션/기프트카드/웹훅/설정/통합 등) 다수 구현
- Admin Console(대시보드, 로그, 잡, 빌링, 시스템 모니터링, 플래그, 컴플라이언스) 구현

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

## 3) 부분 구현 / 미구현 항목

### 3.1 Store Service 미완성
- `services/store.service.ts`
  - `getStoresByTenant()` 빈 배열 반환
  - `getStore()`는 null 반환
  - `createStore()`는 not implemented 예외

### 3.2 Supplier Scraper 일부 어댑터 스켈레톤
- `lib/supplier-scraper/adapters/bifold.ts`
- `lib/supplier-scraper/adapters/countdown.ts`
- `lib/supplier-scraper/adapters/foodstuffs.ts`

위 어댑터들은 주석/로그 기준으로 로그인/상품수집 로직이 stub 상태입니다.

### 3.3 Lightspeed — Order Webhook Ingestion
- Lightspeed order webhook ingestion is not yet implemented (capability flag: `orderWebhookIngestion: false`).

---

## 4) 권장 우선순위 백로그

1. **P1 — Store Service 실제 CRUD 연결**
   - `services/store.service.ts`의 placeholder 제거

2. **P1 — Scraper Adapter 실동작화**
   - Bifold/Countdown/Foodstuffs 로그인 흐름 및 상품 파싱 구현

3. **P2 — Provider Live API Verification**
   - Lightspeed / Uber Eats / DoorDash 실제 credentials로 end-to-end 검증

4. **P2 — Lightspeed Order Webhook Ingestion**
   - Order webhook handling (currently not supported)

---

## 5) 운영 원칙

- 기능 문서(`features.md`)는 **사용자 관점 capability**,
- 로드맵(`doc/roadmap.md`)은 **진행 상태와 다음 작업**,
- 본 문서(`doc/implementation-status.md`)는 **코드 기준 진실원장(source of truth)** 으로 역할 분리 권장.
