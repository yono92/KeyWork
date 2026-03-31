# 프로필 & 유저 시스템 (Profile & User System) — 현행 스펙

## 개요

인증, 프로필 편집, 픽셀 아바타, 업적(31종), 일일 미션/스트릭, 유저 통계, 친구 시스템을 포함하는 유저 시스템 전체.

## 유저 스토리

### [P1] US-01: 이메일 로그인/회원가입
> 사용자로서, 이메일+비밀번호로 가입하고 로그인하여 기록을 저장하고 싶다.

**Acceptance Criteria:**
- Given AuthModal에서 이메일/비밀번호/닉네임 입력 시
- When 가입 또는 로그인 버튼 클릭 시
- Then 세션이 생성되고 사용자 메뉴가 활성화된다

### [P1] US-02: 프로필 편집
> 사용자로서, 닉네임과 아바타를 커스터마이즈하고 싶다.

### [P1] US-03: 업적 확인
> 사용자로서, 달성한 업적과 미달성 업적을 프로필에서 확인하고 싶다.

### [P2] US-04: 일일 미션 & 스트릭
> 사용자로서, 매일 3가지 미션을 수행하고 연속 플레이 스트릭을 유지하고 싶다.

## 기능 요구사항

### FR-001: 인증 (`AuthModal.tsx`)
- Supabase Auth (이메일+비밀번호)
- 가입 시 닉네임 필수 (최대 20자, 중복 검사)
- 비밀번호 최소 6자
- 로그인/가입 모드 토글
- 에러 메시지: 잘못된 자격 증명, 닉네임 중복, 비밀번호 길이

### FR-002: 프로필 페이지 (`profile/page.tsx`)
**프로필 카드:**
- 닉네임 (편집 가능, 최대 20자)
- 픽셀 아바타 (편집 가능)
- 이메일, 가입일, 언어, 테마
- 프로필 완성도 (아바타 없이 75%, 있으면 100%)

**일일 미션 (3종):**
1. "오늘 3판 플레이" — 진행 바
2. "오늘 2가지 모드 시도" — 진행 바
3. "멀티플레이어 1판 완료" — 진행 바

**스트릭:**
- 현재 연속일, 최장 기록
- 상태 배지: "오늘 활동" (초록) / "오늘 플레이하세요" (앰버)
- 최근 7일 활동 히트맵 (점 색상)

**유저 통계:**
- 최근 10경기: 모드, 점수, 정확도/WPM, 승패, 경과 시간
- 모드별 통계: 승수, 플레이 수, 최고/평균 점수

**업적:**
- 전체 업적 목록 (카테고리별 그룹)
- 잠금 해제 상태 + 해제 시간

### FR-003: 픽셀 아바타 (`AvatarEditor.tsx`)
- 7개 커스터마이즈 카테고리:

| 카테고리 | 옵션 |
|----------|------|
| Skin | 6종 피부색 |
| Hair Color | 8종 머리색 |
| Hair | 10 헤어스타일 |
| Eyes | 8 눈 스타일 |
| Mouth | 6 입 스타일 |
| Hat | 8 모자 (선택, 없음 가능) |
| Accessory | 6 악세서리 (선택, 없음 가능) |

- 32×32 픽셀 기반, 16색 팔레트
- 라이브 프리뷰
- 탭 기반 카테고리 전환

### FR-004: 업적 시스템 (22종)

| 카테고리 | 수 | 업적 예시 |
|----------|---|----------|
| 입문 | 3 | 첫 플레이, 3모드 시도, 전모드 시도 |
| 모드 마스터 | 4 | 각 모드별 목표 점수 달성 |
| 기록 | 6 | WPM 50/100/150+, 100% 정확도, 10K 점수 |
| 다작 | 5 | 10/50/100/500회 플레이, 모드별 10회 |
| 멀티플레이 | 4 | 첫 승, 5/20승, 10매치 |

- 점수 제출 후 자동 체크 (`useAchievementChecker.ts`)
- 새 업적 해제 시 배지 애니메이션 (`AchievementUnlockBadge.tsx`)

### FR-005: 친구 시스템
- 친구 추가/삭제 (`useFriends.ts`)
- 게임 초대 발신/수신 (`useGameInvite.ts`)

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/components/auth/AuthModal.tsx` | 로그인/가입 모달 |
| `src/components/auth/UserMenu.tsx` | 사용자 메뉴 |
| `src/components/avatar/AvatarEditor.tsx` | 아바타 편집기 |
| `src/components/avatar/PixelAvatar.tsx` | 아바타 렌더러 |
| `src/components/AchievementUnlockBadge.tsx` | 업적 알림 |
| `src/hooks/useAuth.ts` | 인증 훅 |
| `src/hooks/useAchievements.ts` | 업적 조회 훅 |
| `src/hooks/useAchievementChecker.ts` | 업적 체크 훅 |
| `src/hooks/useUserStats.ts` | 통계 훅 |
| `src/hooks/useFriends.ts` | 친구 훅 |
| `src/hooks/useGameInvite.ts` | 초대 훅 |
| `src/data/achievements.ts` | 업적 정의 |
| `src/data/avatar-parts.ts` | 아바타 파츠 |
| `app/(game)/profile/page.tsx` | 프로필 페이지 |
