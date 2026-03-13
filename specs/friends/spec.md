# 친구 시스템 & 초대 — Spec

## 사용자 스토리

1. 유저가 닉네임으로 다른 유저를 검색하여 친구 요청을 보낼 수 있다.
2. 요청 받은 유저가 수락/거절할 수 있다.
3. 프로필 페이지에서 친구 목록과 대기 중인 요청을 볼 수 있다.
4. 멀티플레이 로비에서 온라인 친구에게 대전 초대를 보낼 수 있다.
5. 초대 받은 유저에게 알림이 표시되고, 수락하면 방에 자동 입장한다.

## 기능 요구사항

### FR-1: friendships 테이블

```
friendships:
  id BIGSERIAL PRIMARY KEY
  requester_id UUID NOT NULL REFERENCES profiles(id)
  addressee_id UUID NOT NULL REFERENCES profiles(id)
  status TEXT NOT NULL DEFAULT 'pending' ('pending' | 'accepted')
  created_at TIMESTAMPTZ DEFAULT now()
  UNIQUE(requester_id, addressee_id)
```

### FR-2: 친구 요청

- 닉네임 검색 (부분 일치, ilike)
- 자기 자신 요청 불가
- 이미 친구/요청 중이면 중복 방지
- 요청 시 상대에게 실시간 알림 (Realtime)

### FR-3: 요청 관리

- 받은 요청: 수락/거절
- 수락 → status = 'accepted'
- 거절 → DELETE row
- 친구 삭제 → DELETE row

### FR-4: 친구 목록

- 프로필 페이지에 친구 섹션
- 아바타 + 닉네임 + 온라인 상태
- 받은 요청 목록 (수락/거절 버튼)

### FR-5: 대전 초대

- 멀티플레이 로비에 "친구 초대" 버튼
- 온라인 친구 목록에서 선택
- Realtime broadcast로 초대 전송
- 상대가 수락하면 방 코드로 자동 입장

## Acceptance Criteria

- [ ] AC-1: 닉네임 검색 + 친구 요청
- [ ] AC-2: 요청 수락/거절
- [ ] AC-3: 프로필에 친구 목록 + 요청 관리
- [ ] AC-4: 멀티플레이 로비에서 초대 전송
- [ ] AC-5: 초대 수락 시 방 입장
- [ ] AC-6: 레트로 테마 적용
