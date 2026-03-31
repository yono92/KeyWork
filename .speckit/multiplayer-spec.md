# 멀티플레이어 (Multiplayer) — 현행 스펙

## 개요

Supabase Realtime(Presence + Broadcast) 기반 실시간 대전 시스템. 테트리스 대전과 끝말잇기 대전 2종, 공통 로비/레디 패널/친구 초대 인프라.

## 유저 스토리

### [P1] US-01: 방 생성 및 참가
> 로그인 사용자로서, 대전 방을 만들거나 대기 중인 방에 참가하고 싶다.

**Acceptance Criteria:**
- Given 로비 진입 시
- When 방 생성 또는 대기 방 클릭 시
- Then 6자 코드의 방이 생성/참가되고 레디 패널이 표시된다

### [P1] US-02: 테트리스 대전
> 사용자로서, 상대와 실시간으로 테트리스를 하면서 가비지 라인으로 공격하고 싶다.

**Acceptance Criteria:**
- Given 양측 레디 후 카운트다운 완료 시
- When 줄 클리어 시 상대에게 가비지 라인이 전송되면
- Then 상대 보드 하단에 가비지가 쌓이고, 보드 오버플로우 시 승패가 결정된다

### [P1] US-03: 끝말잇기 대전
> 사용자로서, 상대와 실시간으로 끝말잇기를 하고 싶다.

**Acceptance Criteria:**
- Given 양측 레디 후 게임 시작 시
- When 15초 턴제로 단어를 교환하면
- Then 무효 단어/타임아웃 시 라이프가 감소하고, 라이프 0이면 패배

## 기능 요구사항

### FR-001: 로비 시스템 (`MultiplayerLobby.tsx`)
- 방 생성: 6자 고유 코드
- 대기 방 목록: 최대 20개, 20분 이내 생성된 방만 표시
- 실시간 목록 갱신 (DB 구독)
- 플레이어 닉네임 + 픽셀 아바타 + 상대 시간 표시
- 로그인 필수 게이트

### FR-002: 레디 패널 (`RoomReadyPanel.tsx`)
- 양측 아바타 + 닉네임 + READY/NOT READY 상태
- 상대 미참가 시 "Waiting..." 표시
- 상대 참가 전 레디 버튼 비활성화
- 나가기 버튼 (로비 복귀)

### FR-003: 방 상태 관리 (`useMultiplayerRoom.ts`)
```
RoomPhase: idle → creating → joining → waiting → countdown → playing → finished → disconnected
```
- Presence 추적: 참가/이탈 감지
- 5초 연결 끊김 타임아웃 → 자동 승리
- 리매치 요청: 방 유지, waiting으로 리셋

### FR-004: 테트리스 대전 (`TetrisBattle.tsx`)
- 300ms 간격 보드 상태 동기화 (Broadcast)
- **가비지 시스템:**
  - 2줄 클리어 → 상대에 1줄 가비지
  - 3줄 → 2줄 가비지
  - 4줄 (TETRIS) → 4줄 가비지
  - 가비지 적용 500ms 딜레이 (반응 시간)
  - 랜덤 갭 위치
- 상대 보드 미니 프리뷰 (42% 크기)
- 승리 조건: 상대 보드 오버플로우

### FR-005: 끝말잇기 대전 (`WordChainBattle.tsx`)
- 15초 턴제, 랜덤 선공
- 한글 단어만 허용 (정규식 검증)
- 체인 연결 검증 (마지막 글자 → 첫 글자)
- 중복 단어 불가 (Set 추적)
- API 검증: `/api/krdict/validate`
- 라이프: 3, 무효/타임아웃 시 -1
- 점수: 단어길이 × 10
- 워밍업 단계 (waiting 중 연습 가능)

### FR-006: Broadcast 이벤트

| 이벤트 | 페이로드 | 용도 |
|--------|---------|------|
| `ready_state` | userId, ready | 레디 상태 동기화 |
| `game_start` | — | 호스트가 카운트다운 시작 |
| `game_over` | winner_id, reason | 승패 결정 |
| `rematch_request` | senderId | 리매치 요청 |
| `board_state` | board, score, lines, level, gameOver | 테트리스 보드 동기화 |
| `garbage` | lines | 테트리스 가비지 공격 |
| `word_submit` | word, nextChar, userId, valid | 끝말잇기 단어 제출 |
| `word_result` | userId, lives | 라이프 변경 |
| `turn_change` | currentUserId, timer | 턴 교대 |

### FR-007: 친구 초대
- `FriendInvitePanel.tsx`: 로비에서 친구에게 직접 초대
- `GlobalInviteHost.tsx`: 전역 초대 수신 컴포넌트
- `InviteToast.tsx`: 초대 알림 토스트

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/components/multiplayer/MultiplayerLobby.tsx` | 로비 |
| `src/components/multiplayer/RoomReadyPanel.tsx` | 레디 패널 |
| `src/components/multiplayer/TetrisBattle.tsx` | 테트리스 대전 |
| `src/components/multiplayer/WordChainBattle.tsx` | 끝말잇기 대전 |
| `src/components/multiplayer/FriendInvitePanel.tsx` | 친구 초대 |
| `src/hooks/useMultiplayerRoom.ts` | 방 관리 훅 |
| `src/hooks/useMultiplayerTetris.ts` | 테트리스 대전 훅 |
| `src/hooks/useMultiplayerWordChain.ts` | 끝말잇기 대전 훅 |
| `src/lib/multiplayerRealtime.ts` | Realtime 채널 헬퍼 |
| `app/(game)/tetris/battle/page.tsx` | 테트리스 대전 라우트 |
| `app/(game)/word-chain/battle/page.tsx` | 끝말잇기 대전 라우트 |
