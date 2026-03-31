# CLAUDE.md

이 파일은 Claude Code가 이 저장소의 코드를 다룰 때 참고하는 가이드입니다.

## 프로젝트 개요

KeyWork는 한국어/영어 타이핑 연습 웹앱으로, 5가지 게임 모드 + 2가지 멀티플레이어 대전을 제공합니다: 문장연습(속담/명언/커스텀 텍스트), 단어 낙하, 끝말잇기, 타이핑 러너, 테트리스, 그리고 테트리스 대전·끝말잇기 대전. Win98/Mac-classic 레트로 테마가 핵심 정체성이며, Supabase 기반 인증/랭킹/멀티플레이어를 지원하고 Vercel에 배포되어 있습니다.

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
- **Press Start 2P** — 픽셀 폰트 (`next/font/google`, `--font-pixel` CSS 변수)
- **Web Audio API** — 합성 효과음 (볼륨 0~100% 조절, Mac-classic 소프트 프리셋)
- **Vercel** 배포 (서버리스 함수로 API 라우트 처리)
- **미사용 패키지**: howler, styled-components (설치만 되어 있고 import 없음)

## 아키텍처

### 라우팅 (Next.js App Router)

`app/(game)/` 라우트 그룹에 공유 레이아웃과 함께 정의:
- `/` — `/practice`로 리다이렉트
- `/practice` — 문장연습 (속담 + 명언 + 커스텀 텍스트)
- `/falling-words` — 단어 낙하 아케이드 게임
- `/word-chain` — 끝말잇기 (krdict API + 로컬 사전)
- `/word-chain/battle` — 끝말잇기 대전 (Supabase Realtime 멀티플레이어)
- `/typing-runner` — 타이핑 러너 (AI 대전 레이스)
- `/tetris` — 테트리스 (싱글플레이어)
- `/tetris/battle` — 테트리스 대전 (Supabase Realtime 멀티플레이어)
- `/leaderboard` — 랭킹 (주간/시즌/올타임)
- `/profile` — 프로필 (통계, 업적, 아바타, 친구)

각 게임 페이지는 개별 SEO 메타태그(title/description/keywords)를 가짐.

### API 라우트 (`app/api/`)

- **`/api/krdict/validate`** — krdict API로 한국어 단어 검증 (명사만, `pos=1`). 1시간 캐시.
- **`/api/krdict/candidates`** — 주어진 한글 글자로 시작하는 단어 후보 반환 (`method=start`). 10분 캐시.
- **`/api/rooms/cleanup`** — 멀티플레이어 방 정리 크론 엔드포인트.

krdict 라우트는 `KRDICT_API_KEY` 환경변수 필요 (Vercel에 설정됨). Supabase 연동에는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 필요.

### 상태 관리 (src/store/store.ts)

Zustand 단일 스토어 (`useTypingStore`)로 전역 상태 관리. **`darkMode`, `language`, `isMuted`, `highScore`, `difficulty`, `retroTheme`, `fxEnabled`, `phosphorColor`, `volume` 9개 필드가 localStorage에 저장** — 나머지 상태(gameMode, progress, text 등)는 새로고침 시 초기화. SSR hydration 불일치 방지를 위해 `_hydrate()` 패턴 사용.

### 레트로 테마 시스템

**테마**: Win98 (기본, 날카로운 베벨) / Mac-classic (둥근 모서리, 부드러운 색조). OS 자동 감지.

**CRT 효과** (`fxEnabled` 토글):
- 스캔라인 오버레이 (라이트 0.03 / 다크 0.06 opacity)
- CRT 곡면 + 비네트 (inset box-shadow)
- CRT 부팅 시퀀스 (앱 로드 시 scaleY 0→1 + brightness 플래시)
- CRT 글리치 페이지 전환 (게임 모드 이동 시)
- 인광(Phosphor) 글로우 (cyan/green/amber 3종, FX 우클릭으로 순환)

**레트로 UI 원칙**:
- `var(--retro-radius)` 사용 (win98: 0px, mac-classic: 8px)
- `retro-panel`, `retro-inset`, `retro-monitor-bezel` CSS 유틸리티
- `font-pixel` (Press Start 2P) — 게임 점수, 타이틀, HUD에 사용
- `backdrop-blur` 사용 금지 — 모던 글래스모피즘 대신 솔리드 레트로 패널
- `rounded-full`, `rounded-2xl` 사용 금지 — `var(--retro-radius)` 또는 조건부 rounded

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
- **TypingInput.tsx** — 문장연습. 속담/명언/커스텀 텍스트 탭. WPM 계산, 정확도 추적, 세션 평균. 레트로 블록 커서.
- **FallingWordsGame.tsx** — 단어 낙하 아케이드. 콤보 시스템, 파워업 6종, 골든 워드(3배), 파티클 폭발, 연쇄 클리어(DOUBLE/TRIPLE), 레벨별 배경 변화, 아케이드 스코어바.
- **WordChainGame.tsx** — AI 대전 끝말잇기. krdict API + 로컬 사전 검증. 픽셀 폰트 HUD, 타이머 프로그레스 바, 레트로 말풍선.
- **TypingRunnerGame.tsx** — 타이핑 러너. AI 대전 레이스, 픽셀 폰트 HUD, 스피드 라인 효과, 마일스톤 픽셀 폰트.
- **TetrisGame.tsx** — 테트리스 싱글플레이어. 픽셀 폰트 라벨(NEXT/HOLD/SCORE/LINES/LEVEL), NES 스타일 베벨 패널. 모바일 터치 대응.
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

**레트로 UI**:
- **FxToggle.tsx** — CRT 효과 ON/OFF + 인광색 순환 (우클릭).
- **Win98TitleButtons.tsx** — Win98 스타일 최소화/최대화/닫기 버튼 (장식).
- **ToastQueue.tsx** — 레트로 패널 스타일 토스트 큐 시스템.
- **RankingWidget.tsx** — 사이드바 랭킹 위젯.
- **CustomTextManager.tsx** — 커스텀 연습 텍스트 관리 (CRUD).
- **AchievementUnlockBadge.tsx** — 업적 달성 알림 배지 (토스트 큐 연동).

### 주요 Hooks (`src/hooks/`)

- **useAuth.ts** — Supabase 인증 상태 관리 (로그인/로그아웃/세션).
- **useMultiplayerRoom.ts** — Supabase Realtime 방 관리 (Presence + Broadcast).
- **useMultiplayerTetris.ts** / **useMultiplayerWordChain.ts** — 대전 모드 동기화.
- **useRunnerEngine.ts** — 타이핑 러너 게임 엔진.
- **useTetrisEngine.ts** — 테트리스 게임 엔진. **useResponsiveTetrisSize.ts** / **useTetrisAnimations.ts** 보조.
- **usePracticeText.ts** — 문장연습 텍스트 로드 (속담/명언).
- **useCustomTexts.ts** — 커스텀 텍스트 CRUD (Supabase).
- **useAchievements.ts** / **useAchievementChecker.ts** — 업적 시스템.
- **useLeaderboard.ts** — 랭킹 데이터 조회.
- **useUserStats.ts** — 유저 통계 조회/계산 (XP/레벨 시스템 제거됨, 일일 미션/스트릭만 유지).
- **useFriends.ts** — 친구 목록/요청 관리.
- **useGameInvite.ts** — 게임 초대 수신/발신.
- **useScoreSubmit.ts** — 게임 점수 Supabase 제출.
- **useWordChainGame.ts** — 끝말잇기 게임 로직.
- **useGameAudio.ts** — 합성 효과음 재생 (볼륨 조절, Mac-classic 소프트 프리셋, crtOn/crtOff 사운드).

### Lib 모듈 (`src/lib/`)

- **apiReliability.ts** — API 재시도/폴백 로직 (타임아웃, 재시도 횟수 제한).
- **clientFetch.ts** — 클라이언트 fetch 래퍼 (타임아웃 포함).
- **fallingWords.ts** — 단어 낙하 유틸 (속도, 스폰, 스코어 계산).
- **multiplayerRealtime.ts** — Supabase Realtime 채널 헬퍼.
- **seasonLeaderboard.ts** — 시즌/주간 랭킹 계산 로직.
- **userStats.ts** — 유저 통계 집계 함수 (일일 미션, 스트릭, 모드별 통계).
- **supabase/** — Supabase 클라이언트 (client.ts, server.ts, middleware.ts, types.ts).

### 데이터

- `src/data/proverbs.json` — 한국어 145개 (속담 + 명언 + 일상/문화/과학 문장) + 영어 129개. TypingInput, TypingRunnerGame에서 사용.
- `src/data/word.json` — 한국어 326개 + 영어 329개 단어 (IT, 음식, 스포츠, 천문, 동물 등). FallingWordsGame에서 사용.
- `src/data/wordchain-dict.json` — 끝말잇기 로컬 단어 사전 (한국어 1281개, 영어 1309개, API 폴백용).
- `src/data/achievements.ts` — 업적 정의 (조건, 아이콘, 설명).
- `src/data/avatar-parts.ts` — 픽셀 아바타 파츠 정의 (44종, 16색 팔레트).

## 참고사항

- 코드베이스 전반에 한국어 주석 사용
- 오디오는 브라우저 정책상 사용자 상호작용(클릭/키입력) 후에야 AudioContext 생성 가능
- TypingInput은 입력 중 잘못된 키보드 배열 감지 시 언어 전환 확인
- 끝말잇기 타이머는 API 검증 중(`isValidatingWord`)과 AI 차례(`isAiTurn`) 동안 일시정지 (Vercel API 지연 대응)
- 레트로 테마는 OS 자동 감지 (macOS → mac-classic, Windows → win98)
- 멀티플레이어는 Supabase Realtime (Presence + Broadcast) 기반, 방 정리는 `/api/rooms/cleanup` 크론으로 처리
- 문장연습은 위키백과 API를 제거하고 로컬 코퍼스 + `scripts/sync-practice-corpus.mjs` 수집 파이프라인으로 전환됨
- XP/레벨 시스템은 제거됨 — 일일 미션과 플레이 스트릭만 유지
- 타이핑 디펜스, 받아쓰기 게임 모드는 제거됨

## spec-kit 워크플로우

기능 개발은 `.speckit/` 디렉토리의 spec-kit 워크플로우를 따릅니다.

1. **Constitution 확인** — `.speckit/constitution.md`에서 프로젝트 원칙 확인
2. **Specify** — `.speckit/[feature]-spec.md` 작성 (유저 스토리, P1/P2/P3 우선순위, Given/When/Then 수용 기준)
3. **Plan** — `.speckit/[feature]-plan.md` 작성 (기술 설계, 아키텍처, 영향 파일)
4. **Tasks** — `.speckit/[feature]-tasks.md` 작성 (Setup → Foundational → User Stories → Polish)
5. **Implement** — 태스크 순서대로 구현
6. **Verify** — `.speckit/[feature]-checklist.md`로 완료 검증

### 우선순위
- **P1**: 크리티컬/차단 이슈 (MVP 필수)
- **P2**: 중요/다음 스프린트
- **P3**: 백로그/나이스투해브

### 완료 조건
- `npm run lint`, `npm run build`, `npm run test:run` 통과
- checklist.md 항목 모두 체크

### 상태/완료 규칙
- 완료 마커: `[x]` 완료, `[ ]` 미완료
- 불명확 항목: `[NEEDS CLARIFICATION]` 마커 사용
- 병렬 태스크: `[P]` 마커로 표기
