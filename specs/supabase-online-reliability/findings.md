# findings.md

## 2026-03-12 조사 메모

### 확인된 원인
1. `MultiplayerLobby` 내부에서 `useMultiplayerRoom()`을 생성해 전투 시작과 함께 hook 인스턴스와 채널이 함께 사라질 수 있다.
2. room 채널이 `broadcast.self = true`인데 테트리스/끝말잇기 수신 훅은 송신자 필터가 없어 자기 이벤트를 상대 이벤트로 처리한다.
3. 끝말잇기 선공이 `"opponent"` 문자열을 사용해 실제 유저 id와 비교되지 않는다.
4. `leaveRoom`은 클라이언트 채널만 정리하고 `rooms` 레코드를 남긴다.
5. 서버 cleanup API는 현재 사용자 컨텍스트의 RLS를 타므로 전역 stale room 삭제를 보장하지 못한다.
6. `signUp()` 이후 프로필 생성 실패 시 Auth 계정만 남고 앱 프로필이 없어질 수 있다.

### 구현 메모
- room 상태는 페이지 레벨에서 유지해 로비/전투 간 채널 수명을 분리하지 않는다.
- 오래된 방은 조회 단계에서 먼저 숨기고, 사용자가 접근 가능한 방만 정리한다.
- `rooms` 정책은 join/update/delete 플로우와 맞게 별도 마이그레이션으로 보강한다.

## 2026-03-12 구현 메모

### 반영 내용
1. `useMultiplayerRoom`을 페이지가 직접 소유하도록 구조를 바꿔 전투 시작 후에도 같은 room/channel 인스턴스를 유지하도록 수정했다.
2. 테트리스/끝말잇기 broadcast payload에 `senderId`를 넣고 자기 이벤트를 무시하게 만들어 self-broadcast 오동작을 제거했다.
3. 끝말잇기 선공은 실제 상대 `userId`를 전달하도록 바꾸고, 오답/중복/사전 미등재 시 목숨이 줄어들도록 보정했다.
4. `leaveRoom()`이 DB의 `rooms` 레코드까지 정리하고, 대기방 조회/빠른 매칭/직접 참가에 1시간 TTL 필터를 추가했다.
5. 회원가입 뒤 프로필 생성이 실패하면 fallback 닉네임으로 `profiles`를 다시 upsert 하도록 보강했다.
6. Supabase `rooms` 정책에 join용 `UPDATE` 조건과 참가자 `DELETE` 정책을 실제 DB 마이그레이션으로 반영했다.

### 검증 결과
- `npm run lint`: 통과
- `npm run test:run`: 통과 (16 files, 68 tests)
- `npm run build`: 통과
- DB 확인: `public.rooms`에 `rooms_update`, `rooms_delete` 정책이 반영됨

### 수동 검증 시나리오
1. 두 계정으로 테트리스 대전 진입 후 내 보드가 상대 미니맵으로 복제되지 않는지 확인
2. 끝말잇기에서 호스트가 후공일 때도 즉시 상대 턴으로 시작되는지 확인
3. 방 생성 후 취소하거나 경기 종료 후 로비로 돌아오면 같은 방 코드가 다시 목록에 남지 않는지 확인
