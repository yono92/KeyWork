# KeyWork

KeyWork는 한국어/영어 타이핑 연습 웹앱으로, 7가지 게임 모드 + 2가지 멀티플레이어 대전을 제공합니다.
Next.js App Router + Supabase 기반으로 동작하며, Vercel에 배포되어 있습니다.

- 배포 주소: Vercel Production Domain (`NEXT_PUBLIC_SITE_URL` 기준)
- 기본 진입 경로: `/` (모드 선택 랜딩), 빠른 시작: `/practice`

## 기술 스택

- Next.js 15 (App Router)
- React 18 + TypeScript
- Zustand (전역 상태 관리)
- Supabase (인증, DB, Realtime 멀티플레이어)
- Tailwind CSS (다크 모드 + 레트로 테마)
- Radix UI + lucide-react
- Web Audio API (타이핑 효과음)
- Vercel (배포 + 서버리스 API)

## 게임 모드

| 경로 | 모드 | 설명 |
|------|------|------|
| `/practice` | 문장연습 | 속담 + 로컬 코퍼스 + 커스텀 텍스트 타이핑 |
| `/falling-words` | 단어 낙하 | 떨어지는 단어를 타이핑하는 아케이드 |
| `/word-chain` | 끝말잇기 | AI 대전 끝말잇기 (krdict API + 로컬 사전) |
| `/typing-runner` | 타이핑 러너 | AI 대전 타이핑 속도 경쟁 |
| `/tetris` | 테트리스 | 싱글플레이어 테트리스 |
| `/typing-defense` | 타이핑 디펜스 | 웨이브 + 보스전 디펜스 |
| `/dictation` | 받아쓰기 | TTS 재생 기반 받아쓰기 |
| `/tetris/battle` | 테트리스 대전 | Supabase Realtime 멀티플레이어 |
| `/word-chain/battle` | 끝말잇기 대전 | Supabase Realtime 멀티플레이어 |
| `/leaderboard` | 랭킹 | 주간/시즌/올타임 랭킹 |
| `/profile` | 프로필 | 통계, 업적, 아바타, 친구 |

## 시작하기

```bash
git clone https://github.com/yono92/KeyWork
cd KeyWork
npm install
npm run dev
```

개발 서버: `http://localhost:3000`

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run build:prod` | `NODE_ENV=production` 빌드 |
| `npm run start` | 빌드 결과 실행 |
| `npm run preview` | 빌드 결과 미리보기 (`start`와 동일) |
| `npm run lint` | ESLint 실행 |
| `npm run reset:cache` | `.next` 캐시 삭제 |
| `npm run test` | Vitest watch 모드 |
| `npm run test:run` | Vitest 단일 실행 |

## PR 전 검증

```bash
npm run lint
npm run build
```

## 프로젝트 구조

- `app/` : Next.js App Router 엔트리 및 라우트
- `app/api/` : API 라우트 (krdict 단어 검증/후보, 방 정리)
- `src/components/` : 게임, 멀티플레이어, 인증, 아바타 등 UI 컴포넌트
- `src/hooks/` : 게임 엔진, 인증, 멀티플레이어 등 커스텀 hooks
- `src/lib/` : API 안정성, Supabase 클라이언트, 랭킹 등 유틸 모듈
- `src/store/store.ts` : Zustand 전역 상태
- `src/utils/` : 한글 자모 분해, 두음법칙, 문장 처리, 단어 다양성 등 유틸
- `src/data/` : 속담, 단어, 끝말잇기 사전, 업적, 아바타 파츠 데이터

## 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `KRDICT_API_KEY` | 국립국어원 한국어기초사전 API 키 (끝말잇기) | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | Yes |
| `OPENDICT_API_KEY` | 우리말샘 API 키 (코퍼스 수집 스크립트용, 런타임 불필요) | No |

Vercel 환경 변수에 설정되어 있습니다.

## 배포 (Vercel)

- Framework Preset: `Next.js`
- Root Directory: `.`
- Build Command: `npm run build`
- Output Directory: 비워두기 (Next.js 기본값 사용)
- Node.js Version: `20.x`

## 라이선스

MIT
