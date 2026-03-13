# 받아쓰기 — Tasks

## T1: 라우팅 및 네비게이션 통합
- config.ts에 GameMode `dictation` 추가, NAV_ITEMS 항목
- NavMenu.tsx, Header.tsx 아이콘 추가
- MainLayout.tsx dynamic import
- app/(game)/dictation/page.tsx 생성
- **완료 조건**: `/dictation` 접근 가능, 네비 메뉴 표시
- **상태**: `대기`

## T2: useDictationEngine 훅 구현
- TTS 재생 (speak 함수, 언어/속도/반복 관리)
- 문제 관리 (10문제, 중복 방지)
- 채점 (한국어 자모/영어 문자 정확도)
- 글자별 diff 계산
- 점수 합산
- TTS 미지원 폴백
- **완료 조건**: 엔진 단독 게임 플로우 관리
- **상태**: `대기`

## T3: DictationGame 컴포넌트 구현
- 난이도 선택 (DifficultySelector)
- 문제 화면 (진행 바, 재생 버튼, 입력창)
- 채점 결과 (원문 + 글자별 하이라이트)
- 결과 화면 (GameOverModal + 리더보드)
- 레트로 테마 적용
- **완료 조건**: 전체 게임 플로우 동작
- **상태**: `대기`

## T4: 테스트 및 빌드 검증
- lint, build 통과
- Playwright 스크린샷 확인
- **상태**: `대기`
