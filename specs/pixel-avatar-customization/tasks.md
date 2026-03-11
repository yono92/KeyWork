# Pixel Avatar Customization — Tasks

## Phase 1: 데이터 & 코어

### T-1: 타입 및 DB 스키마 준비
- `src/lib/supabase/types.ts`에 `AvatarConfig` 인터페이스 추가
- `Profile` 타입에 `avatar_config` 필드 추가
- Supabase SQL: `ALTER TABLE profiles ADD COLUMN avatar_config JSONB DEFAULT NULL`
- **완료 조건**: 타입 컴파일 통과, SQL 준비

### T-2: 파츠 데이터 작성
- `src/data/avatar-parts.ts` 생성
- 16색 팔레트 정의
- 피부(6종), 헤어(10종), 눈(8종), 입(6종), 모자(8종), 악세서리(6종) 픽셀 데이터
- 헤어 컬러 세트(8종), 피부색 세트(6종)
- 기본 아바타 config 상수 (`DEFAULT_AVATAR_CONFIG`)
- **완료 조건**: 모든 파츠가 32x32 범위 내 좌표, 타입 안전

### T-3: PixelAvatar 렌더링 컴포넌트
- `src/components/avatar/PixelAvatar.tsx` 생성
- Canvas 기반 32x32 렌더링 + pixelated 스케일링
- size prop (sm/md/lg/xl)
- config null 시 닉네임 첫 글자 폴백
- useMemo로 불필요한 재렌더링 방지
- **완료 조건**: 모든 사이즈에서 파츠 합성 정상 렌더링

## Phase 2: 에디터 & 프로필

### T-4: AvatarEditor 컴포넌트
- `src/components/avatar/AvatarEditor.tsx` 생성
- 카테고리 탭 UI (피부/헤어/눈/입/모자/악세서리)
- 파츠 썸네일 그리드 선택
- 헤어 컬러 스와치 (8색)
- 실시간 프리뷰 (PixelAvatar xl)
- 저장/취소 버튼
- 레트로 테마 스타일링 (win98 bevel / mac-classic rounded)
- **완료 조건**: 모든 카테고리 탐색, 파츠 선택, 프리뷰 갱신 동작

### T-5: useAuth 및 프로필 연동
- `useAuth`에 `updateAvatar(config: AvatarConfig)` 추가
- `profiles` 테이블에 avatar_config 저장/로드
- 프로필 페이지에 AvatarEditor 통합 (기존 닉네임 첫 글자 → PixelAvatar)
- **완료 조건**: 아바타 저장 후 새로고침해도 유지

## Phase 3: 앱 전역 통합

### T-6: 사이드바 & 리더보드 통합
- `SideNav.tsx` 닉네임 옆에 PixelAvatar(sm) 추가
- `leaderboard/page.tsx` 순위 항목에 PixelAvatar(sm) 추가
- `RankingWidget.tsx` 순위 항목에 PixelAvatar(sm) 추가
- **완료 조건**: 로그인 시 모든 위치에서 아바타 표시

### T-7: 멀티플레이 아바타 전송 및 표시
- `useMultiplayerRoom.ts` presence에 `avatar_config` 포함
- `MultiplayerLobby.tsx` 대기 화면에 내/상대 PixelAvatar(lg)
- `TetrisBattle.tsx` 나/상대 라벨에 PixelAvatar(md)
- `WordChainBattle.tsx` 채팅 말풍선에 PixelAvatar(sm)
- **완료 조건**: 대전 시 상대 아바타 정상 표시

## Phase 4: 테스트 & 마무리

### T-8: 테스트 작성
- 파츠 데이터 무결성 테스트
- PixelAvatar 폴백 테스트
- AvatarEditor 스모크 테스트
- **완료 조건**: 모든 테스트 통과, lint + build 통과
