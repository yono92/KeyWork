# KeyWork Constitution

## 프로젝트 개요

KeyWork는 한국어/영어 타이핑 연습 웹앱으로, 5가지 게임 모드와 2가지 멀티플레이어 대전을 제공한다. Win98/Mac-classic 레트로 테마가 핵심 정체성이며, Supabase 기반 인증/랭킹/멀티플레이어를 지원하고 Vercel에 배포되어 있다.

- **스택**: Next.js 15 (App Router) + React 18 + TypeScript + Zustand + Supabase + Tailwind CSS
- **배포**: Vercel (서버리스)
- **대상 사용자**: 한/영 타이핑 실력을 향상시키려는 사용자

---

## 핵심 원칙

### 1. 레트로 퍼스트

Win98/Mac-classic 미학을 최우선으로 한다. 모던 글래스모피즘(`backdrop-blur`, `rounded-full`, `rounded-2xl`)은 사용하지 않는다. `var(--retro-radius)`, `retro-panel`, `retro-inset`, `font-pixel` 등 기존 레트로 유틸리티를 활용한다.

### 2. 최소 변경

요청 범위 내에서만 수정한다. 무관한 리팩터링, 불필요한 추상화, 추측성 기능 추가를 하지 않는다.

### 3. 한/영 듀얼

모든 타이핑 기능은 한국어와 영어 모두 동작해야 한다. 한글 정확도는 자모 수준(`hangulUtils.ts`)에서 계산하며, 영어는 문자 수준 비교를 사용한다.

### 4. 품질 게이트

모든 변경은 아래 3가지를 통과해야 완료로 인정한다:
- `npm run lint`
- `npm run build`
- `npm run test:run`

### 5. 스펙 우선

기능 구현 전 반드시 spec → plan → tasks 순서로 문서를 작성한다. 문서 없이 구현을 시작하지 않는다.

---

## 제약사항

- Tailwind CSS만 사용 (인라인 스타일, CSS-in-JS 금지)
- `backdrop-blur` 사용 금지 — 솔리드 레트로 패널 사용
- 픽셀 폰트(`font-pixel`, Press Start 2P)는 게임 HUD/점수/타이틀에 사용
- 브라우저 전용 API(`window`, `AudioContext`)는 기존 가드 패턴 준수
- 배포/런타임 설정은 요청 시에만 수정

---

## 우선순위 정의

| 레벨 | 의미 | 기준 |
|------|------|------|
| **P1** | 크리티컬 | MVP 필수, 차단 이슈, 즉시 해결 |
| **P2** | 중요 | 다음 스프린트, 사용자 경험 개선 |
| **P3** | 나이스투해브 | 백로그, 향후 고려 |

---

## 거버넌스

- Constitution 수정 시 변경 사유와 영향 범위를 명시한다.
- 큰 구조 변경이나 의존성 추가는 사용자 확인 후 진행한다.
