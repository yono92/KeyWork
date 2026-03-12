# spec.md

## 문제
현재 `useAuth`는 `onAuthStateChange` 리스너에만 의존해 초기 세션을 복원하고 있어 첫 진입 시 로그인 상태 복원이 늦거나 누락될 수 있다. 또한 로그아웃 시 이전 세션 복원 작업이 늦게 끝나면 UI가 잠깐 다시 로그인된 상태로 되돌아갈 여지가 있다.

## 목표
1. 초기 마운트에서 현재 세션을 명시적으로 조회해 로그인 상태를 안정적으로 복원한다.
2. 로그아웃 직후 클라이언트 상태를 즉시 비워 UI 불일치를 줄인다.
3. 초기 복원과 로그아웃 경쟁 상태를 회귀 테스트로 고정한다.

## 비목표
- Supabase 인증 방식 변경
- 소셜 로그인 추가
- 프로필 스키마 변경

## 수용 기준
1. `src/hooks/useAuth.ts`가 마운트 시 `supabase.auth.getSession()`으로 현재 세션을 복원한다.
2. `src/hooks/useAuth.ts`가 로그아웃 성공 직후 `user/profile/loading` 상태를 정리한다.
3. 늦게 끝난 세션 복원 작업이 로그아웃 이후 상태를 덮어쓰지 않도록 방지한다.
4. `npm run lint`, `npm run test:run`, `npm run build`가 통과한다.
