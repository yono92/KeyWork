# plan.md

## 구현 계획
1. `useAuth`의 예외 경로를 조정해 `user/profile/isLoggedIn` 판단 기준을 일관되게 맞춘다.
2. 인증 훅 회귀 테스트를 추가해 프로필 복원 실패 시 상태 불일치를 막는다.
3. Supabase `rooms_update` 정책을 현재 join flow에 맞게 마이그레이션한다.
4. DB 조회와 lint/test/build로 수정 결과를 검증한다.
