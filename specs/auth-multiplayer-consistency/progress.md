# progress.md

## 진행 현황 (tasks.md 미러링)
| ID | 상태 | 메모 |
| --- | --- | --- |
| T1 | 완료 | 인증 상태 불일치와 `rooms` RLS 차단 원인을 확인함 |
| T2 | 완료 | `useAuth` catch 블록에서 user만 설정하던 것을 완전 로그아웃(clearAuthState)으로 변경. 테스트 업데이트 완료 |
| T3 | 완료 | `rooms_update` RLS 정책 마이그레이션 적용 (`fix_rooms_update_rls_for_join`). USING에 `(status = 'waiting' AND player2_id IS NULL)` 추가 |
| T4 | 완료 | lint, test:run(70/70), build 모두 통과 확인 |
