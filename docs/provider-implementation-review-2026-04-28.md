# Provider 구현 점검 (2026-04-28)

대상: **Uber Eats, DoorDash, Loyverse, Lightspeed**

## 점검 범위

- OAuth 인가 URL / 콜백 토큰 교환
- 토큰 갱신(refresh) 흐름
- 매장 목록 조회(listAvailableStores)
- 카탈로그 Import/Publish 어댑터 구현 상태

## 공통 점검 결과

- 4개 제공자 모두 `OAUTH_TOKEN` 저장/갱신 흐름이 구현되어 있음.
- `listAvailableStores` 구현이 존재하며, 인증 실패 시 안전하게 빈 배열 반환 처리됨.
- 카탈로그 import/publish 어댑터가 채널별로 분리되어 있고, 에러 시 상세 메시지를 반환하도록 구성됨.

## 채널별 요약

### Uber Eats

- OAuth 인가/토큰 교환/리프레시 구현 완료.
- OAuth 콜백 직후 `eats/stores` 조회로 `providerAccount` 보강 로직 존재.
- 카탈로그 publish는 메뉴 문서 전체 read-modify-write(`GET/PUT /menus`) 전략 사용.

### DoorDash

- OAuth 토큰 흐름 + JWT signing key(Drive API) 병행 저장 지원.
- JWT assertion 생성 유틸(`buildJwtAssertion`) 구현됨.
- 카탈로그 publish도 메뉴 문서 단위 read-modify-write 전략 사용.

### Loyverse

- OAuth 및 refresh 흐름 구현 완료.
- 카탈로그 import는 `LoyverseClient`를 통한 카테고리/옵션/아이템 일괄 수집 방식.
- publish에서 modifier group/option standalone 작업은 API 제약으로 unsupported 처리되어 있으며, 에러 메시지가 명확함.

### Lightspeed

- OAuth/refresh/store 조회/카탈로그 import/publish 모두 구현됨.
- PKCE 지원 플래그(`supportsPkce = true`)가 선언되어 있고, 이번 점검에서 인가 URL에
  `code_challenge(S256)`가 포함되도록 보강함.

## 이번 점검에서 반영한 수정

- `adapters/integrations/lightspeed.adapter.ts`
  - `codeVerifier`가 전달된 경우 `code_challenge`, `code_challenge_method=S256`를 인가 URL에 포함하도록 수정.
- `__tests__/lightspeed.adapter.test.ts`
  - 위 동작을 검증하는 테스트 기대값으로 업데이트.
