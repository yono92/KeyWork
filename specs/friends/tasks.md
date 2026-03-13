# 친구 시스템 & 초대 — Tasks

## T1: DB 스키마 + 타입
- Supabase migration: friendships 테이블
- types.ts에 Friendship 타입 추가
- **상태**: `완료`

## T2: useFriends 훅
- 친구 목록, 받은 요청, 보낸 요청 조회
- 요청 보내기, 수락, 거절, 삭제
- 닉네임 검색
- **상태**: `완료`

## T3: 프로필 친구 섹션 UI
- 친구 목록 (아바타 + 닉네임)
- 받은 요청 (수락/거절)
- 친구 추가 (닉네임 검색)
- **상태**: `완료`

## T4: 대전 초대 (Realtime)
- useGameInvite 훅 (초대 전송/수신)
- 멀티플레이 로비에 친구 초대 UI
- 초대 수락 시 방 입장
- **상태**: `완료`

## T5: 테스트 및 빌드 검증
- lint, build 통과
- Playwright 스크린샷
- **상태**: `완료`
