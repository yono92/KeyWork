# 커스텀 텍스트 모드 — Progress

## T1: DB 스키마 + 타입
- **상태**: `완료`

## T2: useCustomTexts 훅
- **상태**: `완료`

## T3: 커스텀 텍스트 관리 UI
- **상태**: `완료`
- CustomTextManager 컴포넌트: 목록, 추가, 수정, 삭제

## T4: 소스 전환 + usePracticeText 확장
- **상태**: `완료`
- TypingInput에 소스 탭 (속담/내 텍스트) 추가
- usePracticeText 훅 확장 (source, customTexts 파라미터)
- localStorage에 선택 상태 저장
- 비로그인 시 "내 텍스트" 비활성

## T5: 테스트 및 빌드 검증
- **상태**: `완료`
- lint 통과, build 통과
- Playwright 스크린샷: 데스크톱/모바일 소스 탭 정상 표시
- Vitest: 커스텀 텍스트 탭 비활성/빈 상태 폴백/저장 실패 메시지 검증
