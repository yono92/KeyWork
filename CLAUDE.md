# CLAUDE.md

이 파일은 Claude Code가 이 저장소의 코드를 다룰 때 참고하는 가이드입니다.

## 프로젝트 개요

KeyWork는 한국어/영어 타이핑 연습 웹앱으로, 6가지 게임 모드를 제공합니다: 타이핑 연습(속담/위키백과 장문), 단어 낙하, 끝말잇기, 타이핑 레이스, 타이핑 디펜스, 받아쓰기. Vercel에 배포되어 있습니다.

## 명령어

- `npm run dev` — Next.js 개발 서버 실행
- `npm run build` — Next.js 프로덕션 빌드
- `npm run build:prod` — NODE_ENV=production 프로덕션 빌드
- `npm run lint` — ESLint 실행 (flat config, eslint.config.js)
- `npm run preview` — 프로덕션 빌드 미리보기 (`next start`)
- `npm run reset:cache` — `.next` 캐시 삭제

테스트 프레임워크는 설정되어 있지 않음 (vitest 설치되어 있으나 테스트 없음).

## 기술 스택

- **Next.js 15** (App Router) + **React 18** + **TypeScript 5.5**
- **Zustand** (v5 RC) — 전역 상태 관리 (`src/store/store.ts`)
- **Tailwind CSS** — 클래스 기반 다크 모드
- **Web Audio API** — 타이핑 효과음 (800Hz 비프, 30ms, 볼륨 0.2)
- **Vercel** 배포 (서버리스 함수로 API 라우트 처리)
- **미사용 패키지**: howler, styled-components, lucide-react (설치만 되어 있고 import 없음)

## 아키텍처

### 라우팅 (Next.js App Router)

`app/(game)/` 라우트 그룹에 공유 레이아웃과 함께 정의:
- `/` — `/practice`로 리다이렉트
- `/practice` — 타이핑 연습 (속담 + 위키백과 장문)
- `/falling-words` — 단어 낙하 아케이드 게임
- `/word-chain` — 끝말잇기 (krdict API 사용)
- `/typing-race` — AI 대전 타이핑 레이스
- `/typing-defense` — 타이핑 디펜스 게임
- `/dictation` — 받아쓰기

### API 라우트 (`app/api/`)

- **`/api/krdict/validate`** — krdict API로 한국어 단어 검증 (명사만, `pos=1`). 1시간 캐시.
- **`/api/krdict/candidates`** — 주어진 한글 글자로 시작하는 단어 후보 반환 (`method=start`). 10분 캐시.
- **`/api/wikipedia`** — 위키백과 랜덤 문서 API 프록시. `?lang=ko` / `?lang=en` 지원. 제목 + 본문(50~500자) 반환. 최대 3회 재시도.

krdict 라우트는 `KRDICT_API_KEY` 환경변수 필요 (Vercel에 설정됨).

### 상태 관리 (src/store/store.ts)

Zustand 단일 스토어 (`useTypingStore`)로 전역 상태 관리. **`darkMode`와 `language`만 localStorage에 저장** — 나머지 상태(gameMode, isMuted, progress, text, input 등)는 새로고침 시 초기화.

### 한국어 처리 (src/utils/)

- **hangulUtils.ts** — 한글 음절을 자모(초성/중성/종성)로 분해하여 글자 단위 정확도 비교. 자모 위치별 가중치 적용.
- **levenshtein.ts** — 분해된 자모 배열에 레벤슈타인 거리 적용하여 타이핑 정확도 계산.
- 한국어 정확도는 자모 수준에서 계산. 영어는 문자 수준 비교.

### 주요 컴포넌트

- **TypingInput.tsx** — 텍스트 소스 탭(속담/장문) 포함 타이핑 연습. WPM 계산, 정확도 추적, 세션 평균. 첫 12초간 700 WPM 상한.
- **FallingWordsGame.tsx** — 단어 낙하 아케이드. 콤보 시스템, 파워업, 3목숨, 레벨 진행.
- **WordChainGame.tsx** — AI 대전 끝말잇기. krdict API로 단어 검증 및 후보 검색. API 검증 중/AI 차례 중 타이머 일시정지.
- **TypingRaceGame.tsx** — AI 대전 레이스. 난이도 선택 (Easy 20 WPM / Normal 35 WPM / Hard 55 WPM).
- **TypingDefenseGame.tsx** — 타이핑 디펜스. 웨이브 + 보스전.
- **DictationGame.tsx** — TTS 재생 기반 받아쓰기.
- **Keyboard.tsx** — 한/영 시각 키보드. 자모-QWERTY 매핑.

### 데이터

- `src/data/proverbs.json` — 한국어 속담 100개 (opendict-korean-proverb 출처) + 영어 속담 100개. TypingInput, TypingRaceGame, TypingDefenseGame, DictationGame에서 사용.
- `src/data/word.json` — 한국어 282개 + 영어 270개 단어. FallingWordsGame, TypingDefenseGame에서 사용.

## 참고사항

- 코드베이스 전반에 한국어 주석 사용
- 오디오는 브라우저 정책상 사용자 상호작용(클릭/키입력) 후에야 AudioContext 생성 가능
- TypingInput은 입력 중 잘못된 키보드 배열 감지 시 언어 전환 확인
- 끝말잇기 타이머는 API 검증 중(`isValidatingWord`)과 AI 차례(`isAiTurn`) 동안 일시정지 (Vercel API 지연 대응)
