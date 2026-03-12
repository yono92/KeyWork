# tasks.md

## 작업 목록
| ID | 작업 | 상태 | 완료 조건 |
| --- | --- | --- | --- |
| T1 | 인증 흐름과 버그 후보 문서화, 수정 범위 확정 | 완료 | `README.md`, `spec.md`, `plan.md`가 현재 이슈 기준으로 정리됨 |
| T2 | 초기 세션 복원 및 로그아웃 상태 정리 로직 구현 | 완료 | `useAuth`가 `getSession()` 복원과 로그아웃 직후 상태 정리를 수행함 |
| T3 | 인증 회귀 테스트와 lint/test/build 검증 실행 | 완료 | 회귀 테스트 추가 후 `npm run lint`, `npm run test:run`, `npm run build` 통과 |
