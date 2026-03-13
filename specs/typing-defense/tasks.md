# Typing Defense — Tasks

## T1: 라우팅 및 네비게이션 통합
- `config.ts`에 GameMode `typing-defense` 추가, NAV_ITEMS 항목 추가
- `NavMenu.tsx`에 VISIBLE_MENU_ITEMS 업데이트
- `app/(game)/typing-defense/page.tsx` 생성
- `MainLayout.tsx`에 dynamic import 추가
- **완료 조건**: `/typing-defense` 접근 시 빈 게임 화면 표시, 네비 메뉴에서 선택 가능
- **상태**: `대기`

## T2: useDefenseEngine 훅 구현
- Enemy 인터페이스 정의
- 웨이브 생성 로직 (generateWave)
- 적 스폰 루프 (setInterval)
- 적 이동 루프 (requestAnimationFrame + delta time)
- 기지 도달 감지 → 목숨 감소
- 타이핑 매칭 로직 (입력 → 적 탐색 → 처치)
- 부분 매칭 하이라이트 상태
- 콤보 시스템
- 점수 계산 (기본 × 콤보 × 난이도)
- 웨이브 전환 (클리어 → 휴식 → 다음 웨이브)
- 보스 웨이브 로직
- 게임 오버 판정
- 일시정지 지원
- **완료 조건**: 엔진 단독으로 게임 상태 관리 가능, 유닛 테스트 통과
- **상태**: `대기`

## T3: TypingDefenseGame 컴포넌트 구현
- 난이도 선택 화면 (DifficultySelector 재사용)
- 카운트다운 (3초)
- 게임 필드 렌더링 (기지 + 적 + 배경)
- 적 렌더링 (타입별 외형, 단어 표시, HP 바)
- HUD (웨이브, 점수, 콤보, 목숨)
- 입력창 (GameInput 재사용)
- 일시정지 (PauseOverlay 재사용)
- 게임 오버 (GameOverModal 재사용 + 리더보드 제출)
- 웨이브 전환 UI (다음 웨이브 번호, 카운트다운)
- 레트로 테마 적용
- **완료 조건**: 게임 전체 플로우 동작 (시작→플레이→게임오버), 레트로 스타일 적용
- **상태**: `대기`

## T4: 시각/사운드 효과
- 적 처치 폭발 파티클
- 보스 처치 화면 흔들림
- 점수 팝업 애니메이션
- 콤보 표시 애니메이션
- 기지 피격 붉은 플래시
- 웨이브 클리어 축하 이펙트
- FX ON/OFF 토글
- 효과음 연동 (useGameAudio)
- CSS 애니메이션 keyframes 추가
- **완료 조건**: 모든 이펙트 동작, FX 토글로 비활성화 가능
- **상태**: `대기`

## T5: 모바일 대응 및 폴리시
- 모바일 세로 레이아웃 (적 위→아래 이동 또는 가로 유지)
- 터치 입력 최적화
- 반응형 HUD
- 접근성 (aria-live, aria-label)
- **완료 조건**: 모바일(375px)~데스크탑(1920px)에서 플레이 가능
- **상태**: `대기`

## T6: 테스트 및 빌드 검증
- useDefenseEngine 유닛 테스트 (웨이브 생성, 점수 계산, 매칭)
- 컴포넌트 스모크 테스트
- lint, test, build 통과
- **완료 조건**: `npm run lint && npm run test:run && npm run build` 모두 통과
- **상태**: `대기`
