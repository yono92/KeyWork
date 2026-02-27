# plan.md

## 구현 전략
Outside-in 기준으로 사용자 경험을 먼저 고정하고, 이후 API/클라이언트 구현을 맞춘다.

## 설계 개요
1. 공통 장애 모델 정의
- 클라이언트가 해석 가능한 에러 코드 집합 정의 (`TIMEOUT`, `UPSTREAM_5XX`, `INVALID_RESPONSE`, `NETWORK`).
- API 라우트 응답 형식 표준화: `{ data?, error?, source }`.

2. API 라우트 안정성 개선
- `fetch`에 `AbortController` 타임아웃 적용.
- 재시도는 최대 1회(짧은 backoff)로 제한.
- 인메모리 캐시에 상한(cap)과 만료 정리(cleanup) 추가.

3. 게임 컴포넌트 폴백 계층
- 1차: 외부 API 데이터
- 2차: 로컬 JSON 데이터
- 3차: 최소 기본 문구(하드코딩 안전값)

4. UX 일관화
- 게임별 실패 배너/상태 문구를 공통 패턴으로 통일.
- 재시도 버튼 제공 + 폴백 모드 표시.

5. 테스트 전략
- API 라우트 단위 테스트 추가(성공/실패/타임아웃).
- 게임 컴포넌트 smoke 테스트에 폴백 시나리오 추가.

## 영향 범위 (예상)
- `app/api/krdict/candidates/route.ts`
- `app/api/krdict/validate/route.ts`
- `app/api/wikipedia/route.ts`
- `src/components/WordChainGame.tsx`
- `src/components/FallingWordsGame.tsx`
- `src/components/TypingInput.tsx` 또는 관련 데이터 로딩 지점
- `tests/**` (API 및 폴백 시나리오)

## 리스크 및 대응
1. 폴백 데이터 품질 저하
- 대응: 최소 길이/정규식 필터로 품질 하한 보장.
2. 재시도 증가로 지연 체감
- 대응: 타임아웃 엄격 적용, 재시도 1회 제한.
3. 기존 게임 밸런스 간접 영향
- 대응: 점수/콤보/XP 계산 로직은 변경 금지.
