# findings.md

## 2026-02-26 초기 진단

### 실행한 검증
- `npm run lint`: 통과
- `npm run test:run`: 8 파일, 27 테스트 통과
- `npm run build`: 통과 (Next.js 15.5.12, app route 18개 생성)

### 코드 조사 결과
1. 외부 API 의존 구간 존재
- `app/api/krdict/candidates/route.ts`
- `app/api/krdict/validate/route.ts`
- `app/api/wikipedia/route.ts`

2. 폴백은 일부 존재하지만 사용자 안내/에러 모델은 분산
- `src/components/FallingWordsGame.tsx`: 한국어 단어 API 실패 시 로컬 단어 폴백 경로 존재
- `src/components/WordChainGame.tsx`: API 실패 시 게임 진행 차단 가능 경로 존재

3. 캐시 운영 리스크
- `Map` 기반 인메모리 캐시에 엔트리 상한/정리 정책이 없어 장시간 인스턴스에서 증가 위험 존재

4. 테스트 갭
- API 라우트 자체 테스트 부재
- 외부 API 실패/타임아웃 시나리오 테스트 부재

### 설계 결정
- 첫 개선 기능은 "안정성/폴백/관측성"에 집중한다.
- 게임 룰과 점수 체계는 유지하고, 실패 대응 레이어만 강화한다.

## 2026-02-26 1차 개선 반영

### 반영 내용
1. SDD 운영 지침 상향
- `AGENTS.md`, `CLAUDE.md`에 SDD 절차/상태 규칙/DoD를 명시해 루트 문서 기준을 통일함.
- `specs/README.md`를 추가해 `specs/` 작업 표준을 고정함.

2. 공통 API 신뢰성 유틸 도입
- `src/lib/apiReliability.ts` 추가
- 표준 에러 코드(`TIMEOUT`, `NETWORK`, `UPSTREAM_4XX`, `UPSTREAM_5XX`, `INVALID_RESPONSE`, `CONFIG_MISSING`, `BAD_REQUEST`) 정의
- `fetchWithTimeoutRetry`(타임아웃 + 제한 재시도), `jsonError`(표준 응답), `pruneCache`(만료/상한 정리) 제공

3. API 라우트 3종 개선
- `app/api/krdict/candidates/route.ts`
- `app/api/krdict/validate/route.ts`
- `app/api/wikipedia/route.ts`
- 공통 에러 모델, 타임아웃/재시도, 캐시 상한 정리 반영

4. 테스트 보강(1차)
- `tests/api/routes.test.ts`: API 에러 계약 검증 추가
- `tests/lib/apiReliability.test.ts`: 공통 유틸 동작 검증 추가

## 2026-02-26 2차 개선 반영 (T6~T10)

### 반영 내용
1. 공통 폴백 안내 UI 추가
- `src/components/game/FallbackNotice.tsx` 신규 추가
- 메시지 + 소스 라벨 + `다시 시도` 버튼 패턴으로 통일

2. `word-chain` 폴백/재시도 UX
- `src/components/WordChainGame.tsx`
- `krdict` 실패 시 `wordchain-dict.json`(korean) 기반 로컬 후보/검증으로 자동 전환
- 상단 폴백 배너 및 `다시 시도` 제공

3. `falling-words` 폴백/재시도 UX
- `src/components/FallingWordsGame.tsx`
- 한국어 단어 API 실패/빈 응답 시 로컬 `word.json` 진행 상태를 배너로 명시
- `다시 시도` 버튼으로 후보 재요청 가능

4. `practice` 위키 폴백 UX
- `src/components/TypingInput.tsx`
- 문장 로딩 시 `/api/wikipedia` 우선 시도
- 실패 시 속담(`proverbs.json`)으로 자동 폴백 + 배너 표시 + 재시도 제공

5. 테스트 확장
- `tests/components/fallback-mode.test.tsx` 추가
- `tests/lib/apiReliability.test.ts`, `tests/api/routes.test.ts`와 함께 폴백/에러 계약 회귀 보강

### 수동 점검 시나리오
1. practice에서 위키 API 실패 시 속담 문장이 표시되고 폴백 배너/재시도 버튼이 노출됨
2. falling-words(한국어)에서 krdict 실패 시 게임 플레이는 유지되고 로컬 단어 폴백 배너가 노출됨
3. word-chain에서 krdict 실패 시 로컬 사전으로 단어 검증/후보 진행이 가능함

### 잔여 리스크
1. 클라이언트 `fetch` 타임아웃은 아직 미적용(브라우저 기본 대기 시간 사용)
2. 폴백 데이터 품질은 정적 JSON에 의존하므로 장기적으로 데이터 품질 관리 정책 필요
