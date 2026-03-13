# Typing Defense — Progress

## T1: 라우팅 및 네비게이션 통합
- **상태**: `완료`
- config.ts에 GameMode, NAV_ITEMS, icon 타입 추가
- NavMenu.tsx, Header.tsx에 shield 아이콘 추가
- MainLayout.tsx에 dynamic import 추가
- app/(game)/typing-defense/page.tsx 생성

## T2: useDefenseEngine 훅 구현
- **상태**: `완료`
- ref 기반 안정적 의존성 설계 (getRandomWordRef 패턴)
- 웨이브 생성, 적 스폰, 이동 루프, 매칭, 점수, 콤보 시스템 구현
- 첫 적 즉시 스폰 + setInterval 방식

## T3: TypingDefenseGame 컴포넌트 구현
- **상태**: `완료`
- DifficultySelector, GameOverModal, PauseOverlay, GameInput 재사용
- HUD (웨이브, 점수, 콤보, FX 토글, 목숨)
- 적 스프라이트 (타입별 이모지, 단어 라벨, 부분 매칭 하이라이트)
- 게임 필드 (기지 + 적 행진)

## T4: 시각/사운드 효과
- **상태**: `완료`
- 적 처치 폭발, 점수 팝업, 기지 피격 플래시, 화면 흔들림
- FX ON/OFF 토글
- CSS 애니메이션 keyframes 6종 추가
- useGameAudio 연동

## T5: 모바일 대응 및 폴리시
- **상태**: `완료`
- Playwright 스크린샷 확인: 데스크탑(1920), 모바일(375)

## T6: 테스트 및 빌드 검증
- **상태**: `완료`
- lint 통과, build 통과
