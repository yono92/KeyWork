# AGENTS.md

KeyWork 저장소에서 작업하는 코딩 에이전트 공통 실행 지침이다.

## 목적

- 요청 범위를 벗어나지 않고 빠르게 검증 가능한 변경을 만든다.
- 기존 코드 구조와 사용자 경험을 유지하면서 필요한 수정만 반영한다.

## 커뮤니케이션

- 기본 응답 언어는 한국어로 한다.
- 결과 보고에는 아래 3가지를 포함한다.
- 수정한 파일 경로
- 실제 동작 변화
- 실행한 검증 명령과 결과

## 프로젝트 컨텍스트

- 앱 성격: 한/영 타이핑 연습 + 미니게임 웹 앱
- 스택: Next.js 15(App Router) + React 18 + TypeScript
- 상태관리: Zustand (`src/store/store.ts`)
- 스타일: Tailwind CSS
- 라우팅: Next.js App Router (`app/`)
- 배포 기준 URL: `https://key-work-rho.vercel.app`

## 핵심 구조

- 엔트리: `app/layout.tsx`
- 루트 랜딩: `app/page.tsx` (모드 선택 페이지)
- 라우트 그룹 레이아웃: `app/(game)/layout.tsx`
- 게임 라우트:
- `app/(game)/practice/page.tsx`
- `app/(game)/falling-words/page.tsx`
- `app/(game)/typing-defense/page.tsx`
- `app/(game)/typing-race/page.tsx`
- `app/(game)/typing-runner/page.tsx`
- `app/(game)/dictation/page.tsx`
- `app/(game)/word-chain/page.tsx`
- 공통 UI 셸: `src/components/AppFrame.tsx`
- 메인 게임 렌더러: `src/components/MainLayout.tsx`
- 테스트 설정: `vitest.config.ts`, `tests/setup.ts`

## 작업 원칙

- 최소 변경 원칙: 요청과 무관한 리팩터링은 하지 않는다.
- 일관성 우선: 기존 컴포넌트 패턴, 네이밍, Tailwind 스타일 방식을 따른다.
- 안정성 우선: 동작이 바뀌는 수정은 영향 범위를 명시한다.
- 사전 합의: 큰 구조 변경이나 의존성 추가는 먼저 사용자 확인을 받는다.

## 도메인 규칙

- 한글 정확도/자모 비교 로직은 `src/utils/hangulUtils.ts`를 기준으로 유지한다.
- 한글 비교 기준을 바꿀 때 `src/utils/levenshtein.ts`와 일관성을 맞춘다.
- 타이핑 기능 변경 시 한/영 모두 동작해야 하며 데이터 파일(`src/data/*.json`) 영향 여부를 확인한다.

## 주의 사항

- `TypingInput.tsx`와 `FallingWordsGame.tsx`는 언어 상태 사용 방식이 다르므로 회귀를 주의한다.
- 브라우저 전용 API(`window`, `AudioContext`)는 기존 패턴대로 가드한다.
- 배포/런타임 설정(`ecosystem.config.js`, `vercel.json`, `next.config.ts`)은 요청이 있을 때만 수정한다.
- 인코딩은 UTF-8을 유지한다.

## 권장 워크플로우

1. 관련 파일을 먼저 찾고(`rg`, `rg --files`) 변경 범위를 확정한다.
2. 구현은 요청 범위 내에서 최소 단위로 진행한다.
3. 변경 후 검증 명령을 실행한다.
4. 요약 보고 시 리스크/후속 작업이 있으면 함께 제시한다.

## SDD 워크플로우 (필수)

1. 기능 작업은 반드시 `specs/[feature-name]/`에서 시작한다.
2. 문서 작성 순서는 `README.md -> spec.md -> plan.md`를 고정한다.
3. 구현 작업 단위는 `tasks.md`에만 정의한다.
4. `progress.md`는 `tasks.md` 상태를 그대로 미러링한다.
5. 기술 이슈/의사결정/학습 내용은 `findings.md`에 날짜와 함께 누적 기록한다.
6. 상태 값은 `대기`, `진행중`, `완료`, `차단`만 사용하고, `진행중` 작업은 동시에 1개만 둔다.

### SDD Definition of Done

1. 해당 task가 `tasks.md`에서 완료 처리됨
2. `progress.md`가 동일 상태로 동기화됨
3. `findings.md`에 근거(결정/리스크/테스트 결과)가 기록됨
4. `npm run lint`, `npm run test:run`, `npm run build` 통과

## 검증 명령

- 정적 점검: `npm run lint`
- 빌드 검증: `npm run build`
- 테스트 검증: `npm run test:run`
- 기능 변경 시 수동 검증 시나리오를 간단히 기록한다.

## 완료 체크리스트

1. 의도한 파일만 수정되었는지 확인
2. `npm run lint` 통과
3. `npm run build` 통과
4. `npm run test:run` 통과
5. 라우트/스토어 변경 시 관련 파일(`MainLayout`, `SideNav`, 각 라우트 페이지) 동기화 확인
6. 한/영 타이핑 정확도 회귀 없음 확인
