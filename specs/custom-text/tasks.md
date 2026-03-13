# 커스텀 텍스트 모드 — Tasks

## T1: DB 스키마 + 타입
- Supabase migration: custom_texts 테이블
- types.ts에 CustomText 타입 추가
- **상태**: `대기`

## T2: useCustomTexts 훅
- CRUD 로직 (Supabase)
- 현재 언어 필터
- **상태**: `대기`

## T3: 커스텀 텍스트 관리 UI
- 텍스트 목록, 추가, 수정, 삭제
- 모달 또는 인라인 폼
- **상태**: `대기`

## T4: 소스 전환 + usePracticeText 확장
- TypingInput에 소스 탭 (속담/내 텍스트) 추가
- usePracticeText 훅에서 커스텀 텍스트 소스 지원
- localStorage에 선택 상태 저장
- **상태**: `대기`

## T5: 테스트 및 빌드 검증
- lint, build 통과
- Playwright 스크린샷
- **상태**: `대기`
