# Progress: Supabase 통합 (인증 + 랭킹 + 멀티플레이)

| Phase | Task | 상태 | 비고 |
|-------|------|------|------|
| 1 기반 | T-1: Supabase 프로젝트 & 패키지 셋업 | 완료 | client.ts, server.ts, middleware.ts, .env.local 완료 |
| 1 기반 | T-2: DB 스키마 생성 | 완료 | schema.sql 실행 완료, types.ts 타입 정의 |
| 2 인증 | T-3: 이메일/비밀번호 인증 | 완료 | AuthProvider, useAuth, AuthModal, UserMenu, Header 통합 |
| 2 인증 | T-4: 프로필 페이지 | 완료 | /profile 라우트, 닉네임 변경 |
| 2 인증 | TODO: 소셜 로그인 | 후순위 | Google/GitHub/카카오 |
| 3 랭킹 | T-5: 점수 제출 | 완료 | useScoreSubmit 훅 |
| 3 랭킹 | T-6: 랭킹 조회 & UI | 완료 | useLeaderboard, RankingWidget, /leaderboard 페이지 |
| 4 공통 | T-7: 방 매칭 시스템 | 완료 | useMultiplayerRoom, MultiplayerLobby, Presence+Broadcast |
| 4 공통 | T-8: 게임 모드 선택 통합 | 완료 | tetris/word-chain 싱글↔대전 토글, SideNav 랭킹/프로필 링크 |
| 5 테트리스 | T-9: useTetrisEngine 확장 | 완료 | useMultiplayerTetris (serialize, garbage, broadcast) |
| 5 테트리스 | T-10: 테트리스 대전 | 완료 | TetrisBattle 컴포넌트, /tetris/battle 라우트 |
| 6 끝말잇기 | T-11: 끝말잇기 대전 | 완료 | WordChainBattle, useMultiplayerWordChain, /word-chain/battle 라우트 |
| 7 마무리 | T-12: 엣지케이스 처리 | 완료 | 5초 disconnect=승리, 재접속 타이머 취소, race condition 방지, 방 TTL 1시간 |
| 7 마무리 | T-13: 테스트 & 빌드 | 완료 | 15 test files, 58 tests 통과, lint 0 errors, build 성공 |
