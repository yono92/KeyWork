# KeyWork

KeyWork는 한글/영문 타자 연습과 미니 게임을 제공하는 웹 앱입니다.
현재 프로젝트는 Next.js App Router 기반으로 동작합니다.

- Production: https://key-work-rho.vercel.app
- 기본 진입 경로: `/practice`

## Tech Stack

- Next.js 15 (App Router)
- React 18 + TypeScript
- Zustand (global state)
- Tailwind CSS
- Vitest + Testing Library

## Routes

- `/practice`
- `/falling-words`
- `/typing-defense`
- `/typing-race`
- `/dictation`
- `/word-chain`

## Getting Started

```bash
git clone https://github.com/yono92/KeyWork
cd KeyWork
npm install
npm run dev
```

개발 서버: `http://localhost:3000`

## Scripts

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npm run build:prod`: `NODE_ENV=production` 빌드
- `npm run start`: 빌드 결과 실행
- `npm run preview`: 빌드 결과 실행 (`start`와 동일)
- `npm run lint`: ESLint 실행
- `npm run test`: Vitest watch 모드
- `npm run test:run`: Vitest 단일 실행

## Validation Checklist

PR 전에 아래를 권장합니다.

```bash
npm run lint
npm run build
npm run test:run
```

## Project Structure

- `app/`: Next.js App Router 엔트리 및 라우트
- `src/components/`: 게임 및 공통 UI 컴포넌트
- `src/store/store.ts`: Zustand 전역 상태
- `src/utils/hangulUtils.ts`: 한글 타이핑 처리 유틸
- `src/utils/levenshtein.ts`: 정확도/거리 계산 유틸
- `src/data/*.json`: 한글/영문 문장 데이터
- `tests/setup.ts`: 테스트 런타임 셋업

## Deployment (Vercel)

이 프로젝트는 Vercel에서 배포합니다.

필수 설정:
- Framework Preset: `Next.js`
- Root Directory: `.`
- Build Command: `npm run build`
- Output Directory: 비워두기 (Next.js 기본값 사용)
- Node.js Version: `20.x`

## License

MIT
