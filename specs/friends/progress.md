# 친구 시스템 & 초대 — Progress

## T1: DB 스키마 + 타입
- **상태**: `완료`
- friendships 테이블 마이그레이션 작성, types.ts에 타입 추가

## T2: useFriends 훅
- **상태**: `완료`
- CRUD 훅 구현 (fetchFriends, searchUsers, sendRequest, acceptRequest, removeFriendship)
- 보낸 요청(outgoingRequests)과 `pending-sent` 상태 판정 반영

## T3: 프로필 친구 섹션 UI
- **상태**: `완료`
- 프로필 페이지에 FriendsSection 추가 (요청 수신, 친구 목록, 검색/추가)

## T4: 대전 초대 (Realtime)
- **상태**: `완료`
- useGameInvite 훅, FriendInvitePanel, InviteToast 구현
- MultiplayerLobby에 초대 기능 통합, 4개 페이지에 gameMode prop 추가

## T5: 테스트 및 빌드 검증
- **상태**: `완료`
- lint 통과, build 통과, Playwright 스크린샷 확인
- Vitest: 친구/받은 요청/보낸 요청 분리와 닉네임 검색 검증
