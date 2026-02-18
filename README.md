# KeyWork

KeyWork는 한국어/영어 타이핑 연습 웹앱으로, 7가지 게임 모드를 제공합니다.
Next.js App Router 기반으로 동작하며, Vercel에 배포되어 있습니다.

- 배포 주소: https://keywork-app.vercel.app
- 기본 진입 경로: `/practice`

## 기술 스택

- Next.js 15 (App Router)
- React 18 + TypeScript
- Zustand (전역 상태 관리)
- Tailwind CSS (다크 모드 지원)
- Web Audio API (타이핑 효과음)
- Vercel (배포 + 서버리스 API)

## 게임 모드

| 경로 | 모드 | 설명 |
|------|------|------|
| `/practice` | 타이핑 연습 | 속담 + 위키백과 장문 타이핑 |
| `/falling-words` | 단어 낙하 | 떨어지는 단어를 타이핑하는 아케이드 |
| `/word-chain` | 끝말잇기 | AI 대전 끝말잇기 (krdict API) |
| `/typing-race` | 타이핑 레이스 | AI 대전 타이핑 속도 경쟁 |
| `/typing-defense` | 타이핑 디펜스 | 웨이브 + 보스전 디펜스 |
| `/typing-runner` | 타이핑 러너 | 단어를 타이핑해서 장애물을 뛰어넘는 러너 |
| `/dictation` | 받아쓰기 | TTS 재생 기반 받아쓰기 |

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
- `app/api/` : API 라우트 (krdict 단어 검증/후보, 위키백과 프록시)
- `src/components/` : 게임 및 공통 UI 컴포넌트
- `src/store/store.ts` : Zustand 전역 상태
- `src/utils/hangulUtils.ts` : 한글 자모 분해 처리 유틸
- `src/utils/levenshtein.ts` : 정확도 계산 유틸
- `src/data/*.json` : 한국어/영어 문장 및 단어 데이터

## 환경 변수

| 변수 | 설명 |
|------|------|
| `KRDICT_API_KEY` | 국립국어원 한국어기초사전 API 키 (끝말잇기, 타이핑 러너에서 사용) |

Vercel 환경 변수에 설정되어 있습니다.

## 배포 (Vercel)

- Framework Preset: `Next.js`
- Root Directory: `.`
- Build Command: `npm run build`
- Output Directory: 비워두기 (Next.js 기본값 사용)
- Node.js Version: `20.x`

## 라이선스

MIT
