# 업적/뱃지 시스템 — Tasks

## T1: DB 스키마 + 타입 정의
- Supabase migration: user_achievements 테이블
- src/lib/supabase/types.ts에 타입 추가
- **상태**: `완료`

## T2: 업적 정의 파일
- src/data/achievements.ts에 25개 업적 정의
- 카테고리: beginner, mode-master, record, grinder, multiplayer
- 각 업적에 check 함수 포함
- **상태**: `완료`

## T3: 업적 검사 훅 (useAchievementChecker)
- 점수 제출 후 미해금 업적 조건 검사
- 새 해금 INSERT + 결과 반환
- **상태**: `완료`

## T4: 프로필 업적 조회 훅 + UI
- useAchievements 훅
- 프로필 페이지에 업적 그리드 추가
- **상태**: `완료`

## T5: 게임 오버 업적 알림 연동
- GameOverModal에 업적 알림 표시
- 각 게임 컴포넌트에서 useAchievementChecker 호출
- **상태**: `완료`

## T6: 테스트 및 빌드 검증
- lint, build 통과
- Playwright 스크린샷
- **상태**: `완료`
