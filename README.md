# KeyWork

한국어/영어 타이핑 연습과 싱글플레이 미니게임을 제공하는 Next.js 웹 앱입니다. 계정 기능 없이 커스텀 문장과 개인 점수만 현재 브라우저에 저장됩니다.

- 배포: https://key-work-rho.vercel.app
- 기본 진입 경로: `/`

## 기술 스택

- Next.js 15 App Router, React 18, TypeScript
- Zustand
- Tailwind CSS, Radix UI, lucide-react
- 브라우저 localStorage
- Vercel

## 게임과 화면

| 경로 | 설명 |
|------|------|
| `/practice` | 속담·명언·커스텀 문장 타이핑 |
| `/falling-words` | 단어 낙하 아케이드 |
| `/word-chain` | 로컬 사전과 krdict API를 사용하는 끝말잇기 |
| `/typing-runner` | AI 상대 타이핑 레이스 |
| `/tetris` | 싱글플레이 테트리스 |
| `/leaderboard` | 현재 브라우저의 모드별 개인 기록 |

## 로컬 데이터

다음 데이터는 현재 브라우저의 localStorage에만 저장됩니다.

- `keywork.customTexts.v1`: 한국어/영어 커스텀 문장
- `keywork.scores.v1`: 최근 게임 점수 최대 500건

계정이나 클라우드 동기화가 없으므로 다른 기기와 공유되지 않으며, 브라우저 데이터를 삭제하면 함께 제거됩니다.

## 시작하기

```bash
git clone https://github.com/yono92/KeyWork
cd KeyWork
npm install
npm run dev
```

개발 서버는 `http://localhost:3000`에서 실행됩니다.

## 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `KRDICT_API_KEY` | 한국어 끝말잇기 사전 API 키 | 런타임 권장 |
| `OPENDICT_API_KEY` | 연습 코퍼스 동기화 스크립트용 | 아니요 |
| `NEXT_PUBLIC_SITE_URL` | 배포 기준 URL 재정의 | 아니요 |

`KRDICT_API_KEY`가 없거나 요청이 실패하면 게임은 로컬 사전을 폴백으로 사용합니다.

## 명령어

```bash
npm run lint
npm run test:run
npm run build
```

기능 변경은 `.speckit/`의 spec → plan → tasks → implement → checklist 순서를 따릅니다.

## 라이선스

MIT
