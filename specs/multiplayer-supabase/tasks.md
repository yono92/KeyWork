# Tasks: Supabase 통합 (인증 + 랭킹 + 멀티플레이)

## Phase 1: Supabase 기반 인프라

### T-1: Supabase 프로젝트 & 패키지 셋업
- [ ] Supabase 프로젝트 생성 (도쿄 리전)
- [ ] `npm install @supabase/supabase-js @supabase/ssr`
- [ ] `.env.local`에 URL + ANON_KEY 추가
- [ ] `src/lib/supabase/client.ts` — 브라우저 클라이언트 (createBrowserClient)
- [ ] `src/lib/supabase/server.ts` — 서버 클라이언트 (createServerClient)
- [ ] `middleware.ts` — 세션 리프레시 미들웨어
- 완료조건: 클라이언트/서버에서 Supabase 연결 확인

### T-2: DB 스키마 생성
- [ ] `profiles` 테이블 + RLS 정책
- [ ] `game_scores` 테이블 + 인덱스 + RLS 정책
- [ ] `rooms` 테이블 + 인덱스 + RLS 정책
- [ ] `get_leaderboard()` DB Function
- [ ] Supabase 대시보드에서 CRUD 테스트
- 완료조건: SQL 에디터에서 모든 테이블/함수 동작 확인

---

## Phase 2: 인증 시스템

### T-3: 이메일/비밀번호 인증
- [ ] Supabase Auth Email 활성화 확인
- [ ] `src/components/auth/AuthProvider.tsx` — 유저 상태 컨텍스트
- [ ] `src/hooks/useAuth.ts` — 회원가입/로그인/로그아웃/유저 정보 훅
- [ ] `src/components/auth/SignUpForm.tsx` — 이메일 + 비밀번호 + 닉네임 회원가입 폼
- [ ] `src/components/auth/LoginForm.tsx` — 이메일 + 비밀번호 로그인 폼
- [ ] `src/components/auth/UserMenu.tsx` — 헤더 유저 메뉴 (닉네임, 로그아웃)
- [ ] `app/(game)/layout.tsx`에 AuthProvider 래핑
- [ ] 헤더에 로그인/유저메뉴 조건부 렌더링
- [ ] 회원가입 시 profiles INSERT (닉네임 포함)
- 완료조건: 회원가입 → 로그인 → 헤더 닉네임 표시 → 로그아웃

### T-4: 프로필 페이지
- [ ] `app/(game)/profile/page.tsx` — 닉네임 변경, 통계 요약
- 완료조건: 프로필 페이지에서 닉네임 변경 동작

### TODO (후순위): 소셜 로그인
- [ ] Google OAuth 연동
- [ ] GitHub OAuth 연동
- [ ] 카카오 OAuth 연동
- [ ] `app/auth/callback/route.ts` — OAuth 콜백 핸들러
- [ ] LoginForm에 소셜 로그인 버튼 추가

---

## Phase 3: 랭킹 시스템

### T-5: 점수 제출
- [ ] `src/hooks/useScoreSubmit.ts` — 게임 결과 game_scores INSERT
- [ ] 각 게임 GameOverModal에서 로그인 시 자동 점수 제출
  - 문장연습: WPM + 정확도
  - 단어낙하: 점수
  - 끝말잇기: 점수
  - 타이핑 러너: 점수 + 거리
  - 테트리스: 점수 + 라인
- [ ] 비로그인 시 "로그인하면 랭킹 등록" 안내 표시
- 완료조건: 게임 오버 → DB에 점수 기록 확인

### T-6: 랭킹 조회 & UI
- [ ] `src/hooks/useLeaderboard.ts` — get_leaderboard() RPC 호출
- [ ] `src/components/ranking/RankingWidget.tsx` — 게임 오버 화면 내 TOP 10 + 내 순위
- [ ] `src/components/ranking/LeaderboardPage.tsx` — 전체 랭킹 페이지
- [ ] `app/(game)/leaderboard/page.tsx` — 랭킹 페이지 라우트
- [ ] 기간 필터 (전체/이번 주/오늘) 탭
- [ ] 게임 모드 탭 (5개 모드)
- [ ] 레트로 테마 적용
- 완료조건: 랭킹 페이지에서 모드별/기간별 TOP 10 표시

---

## Phase 4: 멀티플레이 — 공통

### T-7: 방 매칭 시스템
- [ ] `src/hooks/useMultiplayerRoom.ts`
  - 방 생성 (6자리 코드, rooms INSERT)
  - 방 참가 (코드 조회, player2 UPDATE)
  - 빠른 매칭 (waiting 방 조회 → 참가 or 생성)
  - Presence 채널 (상대 입장/퇴장 감지)
  - sessionStorage roomId 저장 (재접속)
- [ ] `src/components/multiplayer/MultiplayerLobby.tsx`
  - 방 만들기 / 코드 입력 / 빠른 매칭 UI
  - 대기 화면 + 3초 카운트다운
- 완료조건: 두 탭에서 방 생성 → 참가 → 카운트다운 동작

### T-8: 게임 모드 선택 통합
- [ ] 테트리스/끝말잇기 페이지에 "싱글" / "온라인 대전" 토글
- [ ] store에 multiplayerMode 상태 추가
- [ ] 네비게이션에 랭킹/프로필 항목 추가
- 완료조건: 싱글 ↔ 대전 전환 시 기존 싱글 동작 영향 없음

---

## Phase 5: 멀티플레이 — 테트리스

### T-9: useTetrisEngine 확장
- [ ] `addGarbageLines(count)` 메서드 (회색 줄 + 랜덤 빈칸)
- [ ] `onLineClear` 콜백 prop
- [ ] 보드 직렬화/역직렬화 (Cell[][] ↔ number[][])
- 완료조건: 단위 테스트 (가비지 추가, 직렬화 왕복)

### T-10: 테트리스 대전
- [ ] `src/hooks/useMultiplayerTetris.ts` — 보드 동기화 + 가비지 송수신
- [ ] `src/components/multiplayer/TetrisBattle.tsx` — 내 보드 + 상대 미니맵
- [ ] `app/(game)/tetris/battle/page.tsx` — 라우트
- [ ] 가비지 수신 시 0.5초 딜레이 버퍼
- [ ] 승패 결과 → game_scores 기록
- 완료조건: 두 탭에서 테트리스 대전 풀 플로우

---

## Phase 6: 멀티플레이 — 끝말잇기

### T-11: 끝말잇기 대전
- [ ] `src/hooks/useMultiplayerWordChain.ts` — 턴 동기화 + 단어 검증 공유
- [ ] `src/components/multiplayer/WordChainBattle.tsx` — PvP UI
- [ ] `app/(game)/word-chain/battle/page.tsx` — 라우트
- [ ] 선공 결정 (방장 기준 랜덤)
- [ ] 승패 결과 → game_scores 기록
- 완료조건: 두 탭에서 끝말잇기 PvP 풀 플로우

---

## Phase 7: 안정성 & 테스트

### T-12: 엣지케이스 처리
- [ ] 새로고침 재접속 (sessionStorage roomId)
- [ ] 네트워크 끊김 → Supabase 자동 재연결
- [ ] 상대 5초 오프라인 → 승리 처리
- [ ] 방 TTL: 1시간 이상 된 방 무시
- [ ] 동시 매칭 race condition (rooms UPDATE WHERE 조건)
- 완료조건: 끊김/새로고침 시나리오 수동 테스트

### T-13: 테스트 & 빌드
- [ ] 단위: 가비지 라인, 보드 직렬화, 방 코드, 점수 제출
- [ ] 통합: Supabase 채널 mock 브로드캐스트 흐름
- [ ] E2E: Playwright — 로그인, 랭킹 조회, 대전 시나리오
- [ ] `npm run lint` + `npm run build` 통과
- 완료조건: 전체 green + 빌드 성공
