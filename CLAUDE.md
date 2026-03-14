# CLAUDE.md

이 파일은 Claude Code가 이 저장소의 코드를 다룰 때 참고하는 가이드입니다.

## 프로젝트 개요

KeyWork는 한국어/영어 타이핑 연습 웹앱으로, 7가지 게임 모드 + 2가지 멀티플레이어 대전을 제공합니다: 문장연습(속담/로컬 코퍼스/커스텀 텍스트), 단어 낙하, 끝말잇기, 타이핑 러너, 테트리스, 타이핑 디펜스, 받아쓰기, 그리고 테트리스 대전·끝말잇기 대전. Supabase 기반 인증/랭킹/멀티플레이어를 지원하며 Vercel에 배포되어 있습니다.

## 명령어

- `npm run dev` — Next.js 개발 서버 실행
- `npm run build` — Next.js 프로덕션 빌드
- `npm run build:prod` — NODE_ENV=production 프로덕션 빌드
- `npm run lint` — ESLint 실행 (flat config, eslint.config.js)
- `npm run preview` — 프로덕션 빌드 미리보기 (`next start`)
- `npm run reset:cache` — `.next` 캐시 삭제

테스트는 Vitest 기반으로 구성되어 있으며 `tests/`에 단위/스모크 테스트가 존재합니다.

## 기술 스택

- **Next.js 15** (App Router) + **React 18** + **TypeScript 5.5**
- **Zustand** (v5 RC) — 전역 상태 관리 (`src/store/store.ts`)
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) — 인증, DB, Realtime (Presence + Broadcast)
- **Tailwind CSS** — 클래스 기반 다크 모드, 레트로 테마 (win98/mac-classic)
- **Radix UI** — Dialog, Tabs, Progress, Sheet 등 헤드리스 컴포넌트
- **lucide-react** — 아이콘 라이브러리
- **Web Audio API** — 타이핑 효과음 (800Hz 비프, 30ms, 볼륨 0.2)
- **Vercel** 배포 (서버리스 함수로 API 라우트 처리)
- **미사용 패키지**: howler, styled-components (설치만 되어 있고 import 없음)

## 아키텍처

### 라우팅 (Next.js App Router)

`app/(game)/` 라우트 그룹에 공유 레이아웃과 함께 정의:
- `/` — `/practice`로 리다이렉트
- `/practice` — 문장연습 (속담 + 로컬 코퍼스 + 커스텀 텍스트)
- `/falling-words` — 단어 낙하 아케이드 게임
- `/word-chain` — 끝말잇기 (krdict API + 로컬 사전)
- `/word-chain/battle` — 끝말잇기 대전 (Supabase Realtime 멀티플레이어)
- `/typing-runner` — 타이핑 러너 (AI 대전 레이스)
- `/tetris` — 테트리스 (싱글플레이어)
- `/tetris/battle` — 테트리스 대전 (Supabase Realtime 멀티플레이어)
- `/typing-defense` — 타이핑 디펜스 게임 (웨이브 + 보스전)
- `/dictation` — 받아쓰기 (TTS 기반)
- `/leaderboard` — 랭킹 (주간/시즌/올타임)
- `/profile` — 프로필 (통계, 업적, 아바타, 친구)

### API 라우트 (`app/api/`)

- **`/api/krdict/validate`** — krdict API로 한국어 단어 검증 (명사만, `pos=1`). 1시간 캐시.
- **`/api/krdict/candidates`** — 주어진 한글 글자로 시작하는 단어 후보 반환 (`method=start`). 10분 캐시.
- **`/api/rooms/cleanup`** — 멀티플레이어 방 정리 크론 엔드포인트.

krdict 라우트는 `KRDICT_API_KEY` 환경변수 필요 (Vercel에 설정됨). Supabase 연동에는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 필요.

### 상태 관리 (src/store/store.ts)

Zustand 단일 스토어 (`useTypingStore`)로 전역 상태 관리. **`darkMode`, `language`, `isMuted`, `highScore`, `difficulty`, `retroTheme` 6개 필드가 localStorage에 저장** — 나머지 상태(gameMode, progress, text 등)는 새로고침 시 초기화. SSR hydration 불일치 방지를 위해 `_hydrate()` 패턴 사용.

### 유틸리티 (src/utils/)

- **hangulUtils.ts** — 한글 음절을 자모(초성/중성/종성)로 분해하여 글자 단위 정확도 비교. 자모 위치별 가중치 적용.
- **levenshtein.ts** — 분해된 자모 배열에 레벤슈타인 거리 적용하여 타이핑 정확도 계산.
- **dueumUtils.ts** — 두음법칙 처리 (ㄹ→ㄴ, ㄴ→ 탈락 등).
- **koreanConstants.ts** — 한글 자모 상수 정의.
- **sentenceUtils.ts** — 문장 셔플/분할/순환 로직.
- **wordDiversity.ts** — 랜덤 단어 출제 다양성 알고리즘 (접두사 반복 회피).
- **formatting.ts** — 숫자/시간 포맷팅.
- **siteUrl.ts** — 사이트 URL 구성.
- 한국어 정확도는 자모 수준에서 계산. 영어는 문자 수준 비교.

### 주요 컴포넌트

**게임 컴포넌트** (`src/components/`):
- **TypingInput.tsx** — 문장연습. 속담/로컬 코퍼스/커스텀 텍스트 탭. WPM 계산, 정확도 추적, 세션 평균.
- **FallingWordsGame.tsx** — 단어 낙하 아케이드. 콤보 시스템, 파워업, 3목숨, 레벨 진행. 레트로 스타일.
- **WordChainGame.tsx** — AI 대전 끝말잇기. krdict API + 로컬 사전으로 단어 검증. 타이머 일시정지.
- **TypingRunnerGame.tsx** — 타이핑 러너. AI 대전 레이스, 난이도 선택.
- **TetrisGame.tsx** — 테트리스 싱글플레이어. 모바일 대응 경량 모드.
- **TypingDefenseGame.tsx** — 타이핑 디펜스. 웨이브 + 보스전.
- **DictationGame.tsx** — TTS 재생 기반 받아쓰기.
- **Keyboard.tsx** — 한/영 시각 키보드. 자모-QWERTY 매핑.

**멀티플레이어** (`src/components/multiplayer/`):
- **MultiplayerLobby.tsx** — 방 생성/참가 로비.
- **RoomReadyPanel.tsx** — 양쪽 레디 확인 후 게임 시작.
- **TetrisBattle.tsx** — 테트리스 실시간 대전.
- **WordChainBattle.tsx** — 끝말잇기 실시간 대전.
- **FriendInvitePanel.tsx** / **GlobalInviteHost.tsx** / **InviteToast.tsx** — 친구 초대 시스템.

**인증/프로필** (`src/components/auth/`, `src/components/avatar/`):
- **AuthModal.tsx** — Supabase 로그인/회원가입 모달.
- **UserMenu.tsx** — 로그인 사용자 드롭다운 메뉴.
- **PixelAvatar.tsx** / **AvatarEditor.tsx** — 16색 픽셀 아바타 커스터마이징.

**기타**:
- **LevelBadge.tsx** / **LevelUpToast.tsx** — XP 레벨 표시 및 레벨업 알림.
- **RankingWidget.tsx** — 사이드바 랭킹 위젯.
- **CustomTextManager.tsx** — 커스텀 연습 텍스트 관리 (CRUD).
- **AchievementUnlockBadge.tsx** — 업적 달성 알림 배지.

### 주요 Hooks (`src/hooks/`)

- **useAuth.ts** — Supabase 인증 상태 관리 (로그인/로그아웃/세션).
- **useMultiplayerRoom.ts** — Supabase Realtime 방 관리 (Presence + Broadcast).
- **useMultiplayerTetris.ts** / **useMultiplayerWordChain.ts** — 대전 모드 동기화.
- **useRunnerEngine.ts** — 타이핑 러너 게임 엔진.
- **useTetrisEngine.ts** — 테트리스 게임 엔진. **useResponsiveTetrisSize.ts** / **useTetrisAnimations.ts** 보조.
- **useDefenseEngine.ts** — 타이핑 디펜스 게임 엔진.
- **useDictationEngine.ts** — 받아쓰기 TTS 엔진.
- **usePracticeText.ts** — 문장연습 텍스트 로드 (속담/로컬 코퍼스).
- **useCustomTexts.ts** — 커스텀 텍스트 CRUD (Supabase).
- **useAchievements.ts** / **useAchievementChecker.ts** — 업적 시스템.
- **useLeaderboard.ts** — 랭킹 데이터 조회.
- **useUserStats.ts** — 유저 통계 조회/계산.
- **useFriends.ts** — 친구 목록/요청 관리.
- **useGameInvite.ts** — 게임 초대 수신/발신.
- **useScoreSubmit.ts** — 게임 점수 Supabase 제출.
- **useWordChainGame.ts** — 끝말잇기 게임 로직.
- **useGameAudio.ts** — 효과음 재생.

### Lib 모듈 (`src/lib/`)

- **apiReliability.ts** — API 재시도/폴백 로직 (타임아웃, 재시도 횟수 제한).
- **clientFetch.ts** — 클라이언트 fetch 래퍼 (타임아웃 포함).
- **fallingWords.ts** — 단어 낙하 유틸 (속도, 스폰 로직).
- **multiplayerRealtime.ts** — Supabase Realtime 채널 헬퍼.
- **seasonLeaderboard.ts** — 시즌/주간 랭킹 계산 로직.
- **userStats.ts** — 유저 통계 집계 함수.
- **supabase/** — Supabase 클라이언트 (client.ts, server.ts, middleware.ts, types.ts).

### 데이터

- `src/data/proverbs.json` — 한국어 속담 100개 + 영어 속담 100개. TypingInput, TypingRunnerGame, TypingDefenseGame, DictationGame에서 사용.
- `src/data/word.json` — 한국어 282개 + 영어 270개 단어. FallingWordsGame, TypingDefenseGame에서 사용.
- `src/data/wordchain-dict.json` — 끝말잇기 로컬 단어 사전 (API 폴백용).
- `src/data/achievements.ts` — 업적 25개 정의 (조건, 아이콘, 설명).
- `src/data/avatar-parts.ts` — 픽셀 아바타 파츠 정의 (44종, 16색 팔레트).

## 참고사항

- 코드베이스 전반에 한국어 주석 사용
- 오디오는 브라우저 정책상 사용자 상호작용(클릭/키입력) 후에야 AudioContext 생성 가능
- TypingInput은 입력 중 잘못된 키보드 배열 감지 시 언어 전환 확인
- 끝말잇기 타이머는 API 검증 중(`isValidatingWord`)과 AI 차례(`isAiTurn`) 동안 일시정지 (Vercel API 지연 대응)
- 레트로 테마는 OS 자동 감지 (macOS → mac-classic, Windows → win98)
- 멀티플레이어는 Supabase Realtime (Presence + Broadcast) 기반, 방 정리는 `/api/rooms/cleanup` 크론으로 처리
- 문장연습은 위키백과 API를 제거하고 로컬 코퍼스 + `scripts/sync-practice-corpus.mjs` 수집 파이프라인으로 전환됨

## SDD (Spec-Driven Development) 규칙

기능 개발은 아래 순서를 반드시 따릅니다.

1. `specs/[feature-name]/README.md` 작성
- 기능 배경, 목적, 범위/제외 범위 요약

2. `specs/[feature-name]/spec.md` 작성 (Outside-in)
- 사용자 스토리
- 기능/비기능 요구사항
- Acceptance Criteria

3. `specs/[feature-name]/plan.md` 작성
- 기술 설계, 영향 파일, 리스크, 테스트 전략

4. `specs/[feature-name]/tasks.md` 작성
- 구현 가능한 작업 단위로 분해
- 완료 조건 명시

5. 구현 추적
- `progress.md`는 `tasks.md`를 미러링
- 구현 중 발견사항은 `findings.md`에 누적

### 상태/완료 규칙

- 상태 값: `대기`, `진행중`, `완료`, `차단`
- 한 시점에 `진행중` task는 1개만 유지
- 완료 시 `lint`, `test:run`, `build`를 모두 통과해야 함
