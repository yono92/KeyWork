# Route Registry Alignment — Checklist

## 구현 체크

- [x] route registry가 `src/features/game-shell/config.ts`에 추가되었다
- [x] 랜딩이 registry 기반으로 렌더링된다
- [x] 헤더가 `/leaderboard`, `/profile`, battle 경로를 올바르게 표시한다
- [x] sitemap이 registry 기반 공개 라우트만 노출한다
- [x] 실제 없는 라우트가 README/manifest/E2E에서 제거되었다
- [x] admin stats route 테스트가 추가되었다

## 검증 체크

- [x] `npm run lint`
- [x] `npm run test:run`
- [x] `npm run build`

## 잔여 메모

- [ ] Next.js ESLint 플러그인 경고는 별도 lint 설정 작업으로 정리 필요
