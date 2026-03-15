# KeyWork 추가 개발 TODO

## A. 바로 착수 가능 (기반 코드 이미 존재)

- [ ] **타이핑 통계 그래프** — WPM/정확도 시간 추이 차트 (프로필 페이지). useUserStats + game_scores 데이터 활용, recharts 등 라이브러리 추가.
- [ ] **데이터 확장** — 속담 100→300+, 단어 282→500+. scripts/sync-practice-corpus.mjs 파이프라인 활용.
- [ ] **미사용 패키지 정리** — howler, styled-components 제거. 번들 사이즈 감소.

## B. 유저 리텐션 강화 (중간 규모)

- [ ] **알림 시스템** — 업적 달성, 친구 온라인, 대전 초대 알림. GlobalInviteHost + InviteToast 기반 확장.
- [ ] **관전 모드** — 멀티플레이어 대전 실시간 관전. Supabase Realtime 읽기 전용 채널 추가.
- [ ] **게임 내 채팅/이모트** — 대전 중 이모지 전송. Broadcast 채널에 메시지 타입 추가.

## C. 품질 & 안정성 (기술 부채)

- [ ] **E2E 테스트 구축** — Playwright 핵심 플로우 커버 (연습 시작→타이핑→결과).
- [ ] **에러 모니터링 (Sentry)** — 프로덕션 크래시 추적. Vercel + Sentry 연동.
- [ ] **ESLint 빌드 경고 해제** — next.config.ts ignoreDuringBuilds: true 제거 후 경고 수정.

## D. 대규모 신규 기능

- [ ] **토너먼트/시즌 모드** — 주간 토너먼트, 시즌 보상. 리더보드 인프라 위에 확장.
- [ ] **i18n (다국어)** — 일본어/중국어 등 추가. UI 문자열 하드코딩 → next-intl 전환.
- [ ] **프리미엄 코스메틱** — 아바타 파츠 확장, 테마 스킨. avatar-parts.ts 구조 위에 확장.
