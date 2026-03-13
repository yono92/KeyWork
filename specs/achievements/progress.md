# 업적/뱃지 시스템 — Progress

## T1: DB 스키마 + 타입 정의
- **상태**: `완료`

## T2: 업적 정의 파일
- **상태**: `완료`
- 25개 업적 정의 (beginner 3, mode-master 6, record 6, grinder 6, multiplayer 4)

## T3: 업적 검사 훅
- **상태**: `완료`

## T4: 프로필 업적 조회 훅 + UI
- **상태**: `완료`
- 카테고리 필터, 진행률 바, 해금/미해금 그리드

## T5: 게임 오버 업적 알림 연동
- **상태**: `완료`
- DictationGame, TypingDefenseGame: badge prop에 업적 알림 표시
- TetrisBattle, WordChainBattle: 업적 검사만 (알림 없음)

## T6: 테스트 및 빌드 검증
- **상태**: `완료`
- lint 통과, build 통과
- Playwright 스크린샷: 비로그인 시 정상 표시
- Vitest: 업적 정의/조회/해금 훅 테스트 추가
