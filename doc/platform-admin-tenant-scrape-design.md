# 플랫폼 어드민용 테넌트 선택 기반 가격 수집 설계 (Draft)

## 1) 배경 / 문제
현재 `SupplierCredential`은 `tenantId`에 귀속되어 있어, 스크레이프 실행 시 **어떤 테넌트 컨텍스트의 크레덴셜을 사용할지**가 명시적으로 정해져야 합니다. 기존 모델에는 `Tenant`가 플랫폼 운영용인지 구분하는 필드가 없어, 플랫폼 어드민이 가격 수집을 수행할 때 대상 테넌트를 일관되게 선택하기 어렵습니다.

관련 현황:
- `Tenant`에는 플랫폼 테넌트 여부를 나타내는 필드가 없음.
- `SupplierCredential`은 `tenantId` + `supplierId` 단위로 관리됨.
- `SupplierPriceRecord`는 `tenantId` 단위로 관측 이력을 저장함.

## 2) 목표
1. `Tenant`에 플랫폼 테넌트 여부를 저장할 수 있어야 한다.
2. 플랫폼 테넌트가 2개 이상일 때, 어드민이 **스크레이프 실행 시점**에 하나를 선택할 수 있어야 한다.
3. 선택된 테넌트에 등록된 `SupplierCredential`로 인증/수집을 수행해야 한다.
4. 어떤 테넌트를 선택해 실행했는지 감사 추적이 가능해야 한다.

## 3) 비목표 (Non-goals)
- 일반 OWNER 포털의 공급사 크레덴셜 UX 변경
- 기존 가격 저장 모델(`SupplierPriceRecord`) 구조 전면 개편
- 다중 테넌트 동시 병렬 수집 오케스트레이션(후속 단계)

## 4) 제안 아키텍처

### 4.1 데이터 모델 변경

#### Tenant
- `isPlatformTenant Boolean @default(false)` 필드 추가
- 인덱스: `@@index([isPlatformTenant, status])` 권장

효과:
- 플랫폼 운영 대상 테넌트를 명시적으로 분류 가능
- 활성 상태(`status=ACTIVE`)와 결합해 선택 리스트를 빠르게 조회

#### (선택) AuditLog metadata 확장
- 스크레이프 실행 이벤트 metadata에 아래 포함:
  - `executionTenantId`
  - `executionTenantName`
  - `selectedByUserId`
  - `supplierId`, `supplierProductId` 또는 batch 식별자

> 스키마 변경 없이 JSON metadata만으로도 1차 도입 가능.

---

### 4.2 도메인 개념: Execution Tenant Context
플랫폼 어드민 스크레이프의 핵심은 “누가 실행했는가(actor)”와 “어느 테넌트 권한/크레덴셜로 실행했는가(execution tenant)”를 분리하는 것입니다.

- Actor: `PLATFORM_ADMIN` 사용자
- Execution Tenant: `isPlatformTenant=true`인 테넌트 중 선택값
- Credential Resolution Key: `(executionTenantId, supplierId)`

### 4.3 서비스 레이어 계약
신규 서비스(예시): `services/admin/admin-supplier-scrape.service.ts`

주요 메서드:
1. `listExecutionTenants()`
   - `where: { isPlatformTenant: true, status: ACTIVE }`
   - 어드민 화면 드롭다운 데이터 제공
2. `runScrapeAsTenant(input)`
   - 입력: `{ executionTenantId, supplierProductId | url, initiatedByUserId }`
   - 검증:
     - 실행자 `PLATFORM_ADMIN` 권한
     - execution tenant 존재 + `isPlatformTenant=true`
     - 대상 supplier 식별 가능
     - 해당 tenant의 활성 credential 존재
   - 처리:
     - credential decrypt
     - supplier adapter login
     - `scrapeWithSession` 또는 fallback scrape
     - `SupplierPriceRecord`를 `tenantId=executionTenantId`로 기록
   - 감사로그 기록

### 4.4 API 제안

#### `GET /api/admin/supplier-scrape/execution-tenants`
- 응답: `{ items: [{ id, displayName, slug, status }] }`
- 용도: 실행 테넌트 선택 UI

#### `POST /api/admin/supplier-scrape/run`
- 요청:
```json
{
  "executionTenantId": "uuid",
  "supplierProductId": "uuid"
}
```
- 실패 케이스:
  - 400: executionTenantId 누락/형식 오류
  - 403: 플랫폼 어드민 아님
  - 404: 플랫폼 테넌트 아님 또는 대상 없음
  - 409: 해당 테넌트에 활성 credential 없음
  - 422: scraper/로그인 실패

### 4.5 Admin UI 흐름

위치 제안: `/admin/suppliers/[supplierId]` 또는 전용 `/admin/supplier-scrape`

1. **Execution Tenant Select**
   - 기본값: 최근 사용 테넌트(local storage) 또는 첫 ACTIVE 항목
2. **대상 선택**
   - supplier product 단건 또는 URL 입력
3. **실행 전 검증 표시**
   - “선택 테넌트 기준 credential 존재 여부” 배지
4. **실행 결과**
   - 성공: 가격/통화/관측시각
   - 실패: 에러 유형 + 재시도 가이드
5. **감사 정보 노출**
   - “Executed as: {tenantDisplayName}”

## 5) 권한 및 보안
- 오직 `PLATFORM_ADMIN` 가능 (`requirePlatformAdmin` 재사용)
- Credential 복호화는 서버 내부에서만 수행, UI/API 응답에 평문 노출 금지
- 로그 마스킹 정책 재사용 (`sanitize`) 
- 임퍼소네이션 세션에서는 정책적으로 차단 권장 (운영 사고 방지)

## 6) 마이그레이션 / 롤아웃

### Phase 1: 스키마 + 읽기 경로
- `Tenant.isPlatformTenant` 추가 (기본 false)
- 기존 테넌트 중 운영용 테넌트 수동 지정
- execution tenant 목록 API 제공

### Phase 2: 실행 경로 전환
- admin scrape 실행 API에 `executionTenantId` 필수화
- credential 조회 키를 execution tenant 기준으로 고정

### Phase 3: UX/감사 강화
- 최근 선택 테넌트 기억
- 감사로그 대시보드 필터(`executionTenantId`) 추가

## 7) 예외/엣지 케이스
1. 플랫폼 테넌트가 0개
   - UI에서 실행 버튼 비활성 + 설정 가이드 노출
2. 선택한 플랫폼 테넌트에 credential 없음
   - 실행 차단 + credential 등록 링크 제공
3. 선택 직후 테넌트가 비활성화됨
   - 서버에서 최종 검증 후 409 반환
4. 동일 supplier에 대해 테넌트별 상이한 계약가
   - 정상 동작. 관측 레코드는 tenant 스코프이므로 충돌 없음

## 8) 오픈 질문
1. 플랫폼 테넌트 지정 권한을 누구에게 줄지? (PLATFORM_ADMIN only vs SUPER_ADMIN 분리)
2. 스크레이프 결과를 플랫폼 공용 reference price에 즉시 반영할지, 승인 워크플로를 둘지?
3. 단건 실행만 우선할지, 멀티 테넌트 배치 실행을 2차로 설계할지?

## 9) 구현 체크리스트 (초안)
- [ ] Prisma schema: `Tenant.isPlatformTenant` + index
- [ ] Migration SQL 생성
- [ ] Admin service: execution tenant list/read
- [ ] Admin scrape API: `executionTenantId` 필수 검증
- [ ] Credential resolution 로직 execution tenant 기준 전환
- [ ] AuditLog metadata 확장
- [ ] Admin UI selector + validation badge
- [ ] E2E: 다중 플랫폼 테넌트 선택 시 올바른 credential 사용 검증
