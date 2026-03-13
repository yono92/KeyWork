# findings.md

## 2026-03-13 구현 점검

### 확인된 상태
1. 친구 목록, 받은 요청, 닉네임 검색, 대전 초대 UI는 이미 구현되어 있었다.
2. 하지만 `useFriends`는 보낸 요청을 별도 상태로 유지하지 않아, 새로고침 후 검색 결과에서 `요청됨` 상태가 사라질 수 있었다.
3. `specs/friends`에는 `plan.md`, `findings.md`가 없고 `tasks.md`도 모두 `대기`로 남아 있어 실제 구현 상태와 맞지 않았다.

### 반영 내용
1. `useFriends`에 `outgoingRequests`를 추가해 보낸 친구 요청도 훅에서 실제 데이터로 계산하도록 바꿨다.
2. 프로필 친구 섹션에 `보낸 요청` 목록과 취소 액션을 추가하고, 검색 결과도 로컬 `sentIds` 대신 `outgoingRequests` 상태를 기준으로 표시하도록 정리했다.
3. `tests/hooks/useFriends.test.tsx`를 추가해 친구/받은 요청/보낸 요청 분리와 `pending-sent` 상태, 닉네임 검색 흐름을 검증했다.
4. `specs/friends`에 `plan.md`, `findings.md`를 추가하고 `tasks.md` 상태를 완료로 동기화했다.

### 검증 결과
- `npm run lint`: 통과
- `npm run test:run`: 통과
- `npm run build`: 통과
