# 관리자 대시보드 — 작업 목록

## T-1: DB 스키마 & 타입 (대기)
- [ ] `schema.sql` 작성 (role 컬럼, game_config 테이블, RLS 정책)
- [ ] `types.ts` 업데이트 (Profile.role, GameConfig 타입, Database 인터페이스)
- 완료 조건: SQL 실행 가능, 타입 빌드 통과

## T-2: Admin Supabase 클라이언트 & 인증 헬퍼 (대기)
- [ ] `src/lib/supabase/admin.ts` — service_role 기반 클라이언트
- [ ] `src/lib/admin-auth.ts` — API 라우트에서 호출하는 role 검증 함수
- [ ] `.env.example` 업데이트
- 완료 조건: lint 통과, 타입 안전

## T-3: 미들웨어 admin 경로 보호 (대기)
- [ ] `middleware.ts`에서 `/admin` 경로 진입 시 role 확인 → 리다이렉트
- 완료 조건: 미인증/일반유저 → `/` 리다이렉트, admin → 통과

## T-4: Admin API 라우트 (대기)
- [ ] `/api/admin/stats` — 통계 조회 (유저 수, 게임 수, 방 수)
- [ ] `/api/admin/users` — GET (목록), PATCH (역할 변경), DELETE (유저 삭제)
- [ ] `/api/admin/scores` — GET (목록), DELETE (삭제)
- [ ] `/api/admin/rooms` — GET (목록), DELETE (삭제)
- [ ] `/api/admin/game-config` — GET (조회), PUT (수정)
- 완료 조건: 모든 API에서 admin role 검증, lint 통과

## T-5: Admin 대시보드 UI (대기)
- [ ] `app/admin/layout.tsx` — 사이드바 + 콘텐츠 영역
- [ ] `app/admin/page.tsx` — 통계 카드 (유저/게임/방)
- [ ] `app/admin/users/page.tsx` — 유저 테이블 + 역할 토글 + 검색
- [ ] `app/admin/scores/page.tsx` — 점수 테이블 + 필터 + 삭제
- [ ] `app/admin/rooms/page.tsx` — 방 테이블 + 필터 + 삭제
- [ ] `app/admin/game-config/page.tsx` — JSON 에디터 + 저장
- 완료 조건: 빌드 통과, 레트로 테마 적용

## T-6: 게임 설정 클라이언트 연동 (대기)
- [ ] `src/hooks/useGameConfig.ts` — DB config fetch + fallback
- [ ] 각 게임 컴포넌트에서 useGameConfig 적용
- 완료 조건: config fetch 실패 시 기본값 작동, 변경 시 반영

## T-7: 테스트 & 검증 (대기)
- [ ] admin-auth 단위 테스트
- [ ] admin 페이지 스모크 테스트
- [ ] lint, test, build 전체 통과
- 완료 조건: CI 통과
