# Beyond — Implementation Status Audit (2026-04-26)

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

## 2) 부분 구현 / 미구현 항목

아래 항목은 코드 상 TODO/stub/not-implemented 패턴과 실제 구현체를 기준으로 도출했습니다.

### 2.1 Catalog Import Adapter 공백
- `adapters/catalog/uber-eats.adapter.ts`
  - `fetchFullCatalog()`가 현재 빈 배열 payload 반환(stub)
- `adapters/catalog/doordash.adapter.ts`
  - `fetchFullCatalog()`가 현재 빈 배열 payload 반환(stub)

### 2.2 Catalog Publish Adapter 공백
- `adapters/catalog/uber-eats-publish.adapter.ts`
  - 모든 메서드가 미구현 응답 반환
- `adapters/catalog/doordash-publish.adapter.ts`
  - 모든 메서드가 미구현 응답 반환
- `services/catalog-publish/payload-builders/uber-eats/index.ts`
  - not implemented 예외
- `services/catalog-publish/payload-builders/doordash/index.ts`
  - not implemented 예외

### 2.3 Store Service 미완성
- `services/store.service.ts`
  - `getStoresByTenant()` 빈 배열 반환
  - `getStore()`는 null 반환
  - `createStore()`는 not implemented 예외

### 2.4 Supplier Scraper 일부 어댑터 스켈레톤
- `lib/supplier-scraper/adapters/bifold.ts`
- `lib/supplier-scraper/adapters/countdown.ts`
- `lib/supplier-scraper/adapters/foodstuffs.ts`

위 어댑터들은 주석/로그 기준으로 로그인/상품수집 로직이 stub 상태입니다.

### 2.5 문서-구현 불일치 보정 필요 포인트
- 일부 문서 문맥에는 과거 단계의 TODO/Stub 설명이 남아 있어, 최신 구현 수준(특히 Catalog Phase 5~8 완료)과 혼선 가능
- 향후 문서 업데이트 시 “구현 완료”와 “연동 완료”를 분리해 표기하는 방식 권장

---

## 3) 권장 우선순위 백로그

1. **P0 — 외부 채널 카탈로그 양방향 완성도 개선**
   - Uber Eats / DoorDash import adapter 실구현
   - Uber Eats / DoorDash publish adapter + payload builder 실구현

2. **P1 — Store Service 실제 CRUD 연결**
   - `services/store.service.ts`의 placeholder 제거

3. **P1 — Scraper Adapter 실동작화**
   - Bifold/Countdown/Foodstuffs 로그인 흐름 및 상품 파싱 구현

4. **P2 — 문서 일관성 정리**
   - 아키텍처/로드맵/기능 문서의 phase/TODO 흔적 정리
   - 구현 상태를 “완전 구현/부분 구현/스텁”으로 통일 표기

---

## 4) 운영 원칙 제안

- 기능 문서(`features.md`)는 **사용자 관점 capability**,
- 로드맵(`doc/roadmap.md`)은 **진행 상태와 다음 작업**,
- 본 문서(`doc/implementation-status.md`)는 **코드 기준 진실원장(source of truth)** 으로 역할 분리 권장.

