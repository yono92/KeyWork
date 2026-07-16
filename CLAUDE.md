# CLAUDE.md

KeyWork 저장소 작업 가이드입니다.

## 프로젝트 개요

KeyWork는 한국어/영어 타이핑 연습과 5개 싱글플레이 게임 모드를 제공하는 Next.js 앱입니다. Win98/Mac-classic 레트로 테마를 유지하며, 커스텀 문장과 점수는 계정 없이 브라우저 localStorage에 저장합니다.

## 명령어

- `npm run dev` — 개발 서버
- `npm run lint` — ESLint
- `npm run test:run` — Vitest 전체 실행
- `npm run build` — 프로덕션 빌드
- `npm run reset:cache` — `.next` 캐시 삭제

## 기술 스택

- Next.js 15 App Router + React 18 + TypeScript
- Zustand (`src/store/store.ts`)
- Tailwind CSS + Radix UI + lucide-react
- 브라우저 localStorage
- Vercel 서버리스 API (`app/api/krdict/**`)

## 라우팅

- `/` — 모드 선택 랜딩
- `/practice` — 문장연습
- `/falling-words` — 단어 낙하
- `/word-chain` — 로컬 사전 + krdict API 끝말잇기
- `/typing-runner` — 타이핑 러너
- `/tetris` — 테트리스
- `/leaderboard` — 현재 브라우저의 개인 기록

## 로컬 데이터 경계

- `src/lib/localData.ts`에서 버전형 키와 런타임 검증을 관리합니다.
- `keywork.customTexts.v1`: 커스텀 문장
- `keywork.scores.v1`: 게임 점수 최대 500건
- 브라우저 API는 Client Component의 effect 또는 사용자 이벤트에서만 접근합니다.
- 저장소 손상·접근 제한 시 안전한 기본값으로 동작해야 합니다.
- 데이터는 기기 간 동기화되지 않습니다.

## 핵심 코드

- `src/components/MainLayout.tsx` — 게임 렌더러
- `src/components/AppFrame.tsx` — 공통 UI 셸
- `src/components/TypingInput.tsx` — 문장연습
- `src/components/FallingWordsGame.tsx` — 단어 낙하
- `src/components/WordChainGame.tsx` — 끝말잇기
- `src/components/TypingRunnerGame.tsx` — 타이핑 러너
- `src/components/TetrisGame.tsx` — 테트리스
- `src/hooks/useLocalScoreSubmit.ts` — 로컬 점수 제출
- `src/hooks/useCustomTexts.ts` — 로컬 커스텀 문장 CRUD

## 도메인 규칙

- 한글 비교는 `src/utils/hangulUtils.ts`의 자모 분해를 기준으로 합니다.
- 정확도 기준 변경 시 `src/utils/levenshtein.ts`와 일관성을 유지합니다.
- 한/영 타이핑 모두 회귀 테스트합니다.
- `window`, `localStorage`, `AudioContext`는 서버 렌더링 가드를 적용합니다.
- 레트로 UI에서는 `var(--retro-radius)`, `retro-panel`, `retro-inset`, `font-pixel`을 우선 사용하고 `backdrop-blur`를 사용하지 않습니다.

## 외부 API

`app/api/krdict/validate`와 `app/api/krdict/candidates`는 `KRDICT_API_KEY`를 사용합니다. API 요청 실패 시 로컬 단어 사전으로 폴백해야 합니다.

## spec-kit 워크플로우

기능 개발은 `.speckit/constitution.md`를 준수하고 spec → plan → tasks → implement → checklist 순서로 진행합니다. 완료 조건은 tasks/checklist 체크와 다음 세 명령 통과입니다.

- `npm run lint`
- `npm run test:run`
- `npm run build`
