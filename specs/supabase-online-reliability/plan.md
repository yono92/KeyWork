# plan.md

## 구현 계획
1. 멀티플레이 room 상태를 페이지 레벨로 올려 로비와 전투가 같은 hook 인스턴스를 공유하게 만든다.
2. broadcast payload에 `senderId`를 넣고 게임 훅에서 자기 이벤트를 무시하도록 정리한다.
3. 끝말잇기 선공/턴 전환을 실제 상대 유저 id 기준으로 수정한다.
4. 방 나가기와 대기방 조회에 만료 기준을 넣고 Supabase `rooms` 정책을 join/delete 흐름에 맞게 보강한다.
5. 회원가입 시 프로필 생성 실패를 fallback 프로필 생성으로 복구하고 테스트를 추가한다.
6. lint/test/build와 DB 정책 확인 결과를 `findings.md`, `progress.md`에 기록한다.
