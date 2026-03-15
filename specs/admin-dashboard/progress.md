# 관리자 대시보드 — 진행 상황

| Task | 상태 | 비고 |
|------|------|------|
| T-1: DB 스키마 & 타입 | 완료 | schema.sql, types.ts 업데이트 |
| T-2: Admin 클라이언트 & 인증 | 완료 | admin.ts, admin-auth.ts |
| T-3: 미들웨어 보호 | 완료 | /admin 경로 role 체크 |
| T-4: Admin API 라우트 | 완료 | stats, users, scores, rooms, game-config |
| T-5: Admin 대시보드 UI | 완료 | 대시보드, 유저, 점수, 방, 게임설정 |
| T-6: 게임 설정 연동 | 완료 | useGameConfig 훅 (fallback 포함) |
| T-7: 테스트 & 검증 | 완료 | lint, test(94), build 통과 |

## 남은 작업
- Supabase에서 `schema.sql` 실행 (role 컬럼 + game_config 테이블)
- 첫 관리자 계정 생성: `UPDATE profiles SET role='admin' WHERE nickname='...'`
- Vercel에 `SUPABASE_SERVICE_ROLE_KEY` 환경변수 설정
- 각 게임 컴포넌트에서 `useGameConfig` 훅 실제 적용 (현재는 훅만 구현, 컴포넌트 교체는 미적용)
