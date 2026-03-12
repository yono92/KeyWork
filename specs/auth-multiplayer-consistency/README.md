# auth-multiplayer-consistency

로그인 세션이 살아 있어도 프로필 UI와 멀티플레이 진입 상태가 엇갈리는 문제를 정리하는 작업이다.

## 범위
- 인증 컨텍스트에서 `user`/`profile` 상태를 일관되게 유지
- 프로필 미복원 시 UI가 로그인으로 오인하지 않도록 보정
- 멀티플레이 방 참가를 막는 `rooms` RLS 정책 수정
- 테스트, DB 재확인, lint/test/build 검증
